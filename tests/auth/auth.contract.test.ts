import { readFileSync } from "node:fs";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import { errorHandler } from "../../src/middlewares/error.middleware.js";
import { AuthError } from "../../src/modules/auth/auth.error.js";
import { AuthRateLimitService } from "../../src/modules/auth/auth-rate-limit.service.js";
import createAuthRouter from "../../src/modules/auth/auth.router.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { dispatchAuthRequest } from "./auth.http.fixture.js";

import type { Express, RequestHandler } from "express";
import type { AuthAccount, AuthUserAccounts } from "../../src/modules/auth/auth.types.js";

const specification: unknown = parse(readFileSync("docs/openapi.yaml", "utf8"));

function contractValue(...path: string[]): unknown {
    let current: unknown = specification;
    for (const key of path) {
        if (current === null || typeof current !== "object" || !(key in current)) {
            throw new Error(`Missing OpenAPI contract component: ${path.join("/")}`);
        }
        current = Reflect.get(current, key);
    }
    return current;
}

function errorExample(name: string): unknown {
    return contractValue("components", "examples", name, "value");
}

const credentials = JSON.stringify({ email: " OLENA@EXAMPLE.COM ", password: "test-password" });
const account: AuthAccount = {
    id: "account-id",
    passwordHash: "stored-hash",
    isActive: true,
    role: "OWNER",
};

describe("prepared auth router contract", () => {
    let app: Express;
    let find: ReturnType<typeof vi.fn<AuthUserAccounts["findForAuthentication"]>>;
    let update: ReturnType<typeof vi.fn<AuthUserAccounts["updateLastLoginAt"]>>;
    let now: number;

    beforeEach(() => {
        vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://crm.example.com");
        vi.stubEnv("AUTH_COOKIE_SECURE", "true");
        vi.stubEnv("NODE_ENV", "test");
        vi.spyOn(console, "error").mockImplementation(() => {});
        now = 0;
        find = vi.fn<AuthUserAccounts["findForAuthentication"]>().mockResolvedValue(account);
        update = vi.fn<AuthUserAccounts["updateLastLoginAt"]>().mockResolvedValue(undefined);
        const service = new AuthService(
            { findForAuthentication: find, updateLastLoginAt: update },
            { issue: async () => "test-token" },
            new AuthRateLimitService({ maxAttempts: 5, windowMs: 300_000 }, () => now),
            {
                hash: async () => "dummy-hash",
                verify: async (password) => password === "test-password",
            },
        );
        // CRM-102.2 verification is injected: these tests do not pretend to verify JWTs.
        const authenticate: RequestHandler = (req, _res, next) => {
            if (req.headers.cookie === "crm_access_token=test-token") return next();
            next(
                new AuthError({
                    kind:
                        req.headers.cookie === "crm_access_token=expired"
                            ? "TOKEN_STALE"
                            : "UNAUTHORIZED",
                }),
            );
        };
        app = express();
        app.use(express.json());
        app.use("/api/auth", createAuthRouter(service, authenticate));
        app.use(errorHandler);
        app.use((_req, res) => {
            res.status(404).json({ message: "Not found" });
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("matches the login JSON contract and places the token only in a cookie", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(result.status).toBe(200);
        expect(result.body).toEqual(
            contractValue("components", "schemas", "LoginResponse", "example"),
        );
        expect(result.headers["cache-control"]).toBe("no-store");
        expect(String(result.headers["set-cookie"])).toContain("crm_access_token=test-token;");
        for (const attribute of [
            "Max-Age=3600",
            "Path=/api",
            "HttpOnly",
            "Secure",
            "SameSite=Lax",
        ]) {
            expect(String(result.headers["set-cookie"])).toContain(attribute);
        }
        expect(JSON.stringify(result.body)).not.toContain("test-token");
        expect(find).toHaveBeenCalledWith("olena@example.com");
        expect(update).toHaveBeenCalledTimes(1);
    });

    it.each(["wrong password", "missing email", "employee without account", "inactive account"])(
        "matches the same generic 401 for %s",
        async (scenario) => {
            if (scenario === "missing email" || scenario === "employee without account")
                find.mockResolvedValue(null);
            if (scenario === "inactive account")
                find.mockResolvedValue({ ...account, isActive: false });
            const body =
                scenario === "wrong password"
                    ? JSON.stringify({ email: "olena@example.com", password: "wrong" })
                    : credentials;
            const result = await dispatchAuthRequest(app, "/api/auth/login", body);
            expect(result.status).toBe(401);
            expect(result.body).toEqual(errorExample("InvalidCredentials"));
            expect(result.headers["set-cookie"]).toBeUndefined();
            expect(update).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        },
    );

    it.each([undefined, "", "null", "[]", '"text"', '{"password":"sensitive-value"'])(
        "matches 400 for a malformed or missing body: %s",
        async (body) => {
            const result = await dispatchAuthRequest(app, "/api/auth/login", body);
            expect(result.status).toBe(400);
            expect(result.body).toEqual(errorExample("BadRequest"));
            expect(find).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        },
    );

    it("matches the 422 field-error example", async () => {
        const result = await dispatchAuthRequest(
            app,
            "/api/auth/login",
            JSON.stringify({ email: "invalid", password: "short" }),
        );
        expect(result.status).toBe(422);
        expect(result.body).toEqual(errorExample("ValidationError"));
    });

    it("reports both required fields for {}", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/login", "{}");
        expect(result.status).toBe(422);
        expect(result.body).toMatchObject({
            details: [
                { field: "email", message: "Email is required." },
                { field: "password", message: "Password is required." },
            ],
        });
    });

    it("rejects a disallowed origin before querying accounts", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/login", credentials, {
            origin: "https://other.example.com",
        });
        expect(result.status).toBe(403);
        expect(result.body).toEqual(errorExample("Forbidden"));
        expect(find).not.toHaveBeenCalled();
    });

    it("returns contract 429 and Retry-After after five failures, then resumes", async () => {
        find.mockResolvedValue(null);
        for (let i = 0; i < 5; i += 1)
            expect((await dispatchAuthRequest(app, "/api/auth/login", credentials)).status).toBe(
                401,
            );
        const blocked = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual(errorExample("TooManyAttempts"));
        expect(blocked.headers["retry-after"]).toBe("300");
        now = 300_000;
        find.mockResolvedValue(account);
        expect((await dispatchAuthRequest(app, "/api/auth/login", credentials)).status).toBe(200);
    });

    it("sanitizes upstream exceptions without logging their credentials, hashes or tokens", async () => {
        find.mockRejectedValue(
            Object.assign(new Error("password=secret jwt=test-token hash=stored-hash"), {
                query: "secret",
            }),
        );
        const result = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(result.status).toBe(500);
        expect(result.body).toEqual(errorExample("InternalServerError"));
        expect(console.error).toHaveBeenCalledExactlyOnceWith("Authentication request failed.");
    });

    it("clears the cookie on logout and does not revoke a copied token", async () => {
        const headers = { cookie: "crm_access_token=test-token" };
        const first = await dispatchAuthRequest(app, "/api/auth/logout", undefined, headers);
        expect(first.status).toBe(200);
        expect(first.body).toEqual(
            contractValue(
                "paths",
                "/auth/logout",
                "post",
                "responses",
                "200",
                "content",
                "application/json",
                "example",
            ),
        );
        expect(String(first.headers["set-cookie"])).toContain("crm_access_token=;");
        expect(String(first.headers["set-cookie"])).toContain("Max-Age=0");
        expect(
            (await dispatchAuthRequest(app, "/api/auth/logout", undefined, headers)).status,
        ).toBe(200);
        const repeated = await dispatchAuthRequest(app, "/api/auth/logout");
        expect(repeated.status).toBe(401);
        expect(repeated.body).toEqual(errorExample("Unauthorized"));
        expect(String(repeated.headers["set-cookie"])).toContain("Max-Age=0");
    });

    it("clears expired authentication cookies and matches TOKEN_STALE", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/logout", undefined, {
            cookie: "crm_access_token=expired",
        });
        expect(result.status).toBe(401);
        expect(result.body).toEqual(errorExample("TokenStale"));
        expect(String(result.headers["set-cookie"])).toContain("Max-Age=0");
    });

    it("rejects logout request bodies", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/logout", "{}", {
            cookie: "crm_access_token=test-token",
        });
        expect(result.status).toBe(400);
        expect(result.body).toEqual(errorExample("BadRequest"));
        expect(result.headers["set-cookie"]).toBeUndefined();
    });

    it("accepts an explicitly zero-length logout body", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/logout", "", {
            cookie: "crm_access_token=test-token",
        });
        expect(result.status).toBe(200);
        expect(String(result.headers["set-cookie"])).toContain("Max-Age=0");
    });

    it("rejects non-JSON logout bodies even when the JSON parser skips them", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/logout", "text", {
            cookie: "crm_access_token=test-token",
            "content-type": "text/plain",
        });
        expect(result.status).toBe(400);
        expect(result.body).toEqual(errorExample("BadRequest"));
        expect(result.headers["set-cookie"]).toBeUndefined();
    });

    it("sanitizes malformed logout JSON without clearing authentication", async () => {
        const result = await dispatchAuthRequest(
            app,
            "/api/auth/logout",
            '{"password":"sensitive-value"',
            {
                cookie: "crm_access_token=test-token",
            },
        );
        expect(result.status).toBe(400);
        expect(result.body).toEqual(errorExample("BadRequest"));
        expect(result.headers["set-cookie"]).toBeUndefined();
        expect(console.error).not.toHaveBeenCalled();
    });

    it("exposes no public registration route or OpenAPI operation", async () => {
        const result = await dispatchAuthRequest(app, "/api/auth/register", credentials);
        expect(result.status).toBe(404);
        expect(contractValue("paths")).not.toHaveProperty("/auth/register");
        expect(find).not.toHaveBeenCalled();
    });
});
