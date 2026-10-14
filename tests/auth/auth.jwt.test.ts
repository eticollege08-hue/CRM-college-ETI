import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAuth } from "../../src/middlewares/auth.middleware.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";
import { jsonBodyParser } from "../../src/middlewares/json.middleware.js";
import { authTokenService } from "../../src/modules/auth/auth-token.service.js";
import createAuthRouter from "../../src/modules/auth/auth.router.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { verifyToken } from "../../src/utils/jwt.util.js";
import { dispatchAuthRequest } from "./auth.http.fixture.js";

import type { Express } from "express";
import type { AuthAccount, AuthUserAccounts } from "../../src/modules/auth/auth.types.js";
import type { AuthHttpResponse } from "./auth.http.fixture.js";

const SECRET = "auth-integration-test-only-secret";
const PASSWORD = "ExamplePassword123!";
const payload = { userId: "550e8400-e29b-41d4-a716-446655440000", role: "OWNER" } as const;
const credentials = JSON.stringify({ email: "  ADMIN@EXAMPLE.COM  ", password: PASSWORD });

function authCookie(result: AuthHttpResponse): string {
    const cookies = result.headers["set-cookie"];
    const header = Array.isArray(cookies) ? cookies[0] : cookies;
    if (typeof header !== "string") {
        throw new Error("Expected authentication cookie.");
    }
    const cookie = header.split(";")[0];
    if (!cookie) throw new Error("Expected cookie value.");
    return cookie;
}

describe("auth integration with real JWT and middleware", () => {
    let app: Express;
    let account: AuthAccount;
    let find: ReturnType<typeof vi.fn<AuthUserAccounts["findForAuthentication"]>>;
    let update: ReturnType<typeof vi.fn<AuthUserAccounts["updateLastLoginAt"]>>;

    beforeEach(async () => {
        vi.stubEnv("JWT_SECRET", SECRET);
        vi.stubEnv("JWT_EXPIRES_IN", "3600");
        vi.stubEnv("BCRYPT_COST", "4");
        vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://crm.example.com");
        vi.stubEnv("AUTH_COOKIE_SECURE", "true");
        vi.stubEnv("LOGIN_MAX_FAILED_ATTEMPTS", "5");
        vi.stubEnv("LOGIN_ATTEMPT_WINDOW_SECONDS", "300");
        vi.spyOn(console, "error").mockImplementation(() => {});
        account = {
            id: payload.userId,
            role: payload.role,
            isActive: true,
            passwordHash: await bcrypt.hash(PASSWORD, 4),
        };
        find = vi.fn<AuthUserAccounts["findForAuthentication"]>().mockResolvedValue(account);
        update = vi.fn<AuthUserAccounts["updateLastLoginAt"]>().mockResolvedValue(undefined);
        const service = new AuthService({ findForAuthentication: find, updateLastLoginAt: update });
        app = express();
        app.use(jsonBodyParser);
        // No JWT issuer or authentication middleware mock is passed here.
        app.use("/api/auth", createAuthRouter(service));
        app.post("/api/protected", cookieParser(), isAuth, (req, res) => {
            res.json({ user: req.user });
        });
        app.use(errorHandler);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("signs login claims, aligns expiry and cookie lifetime, then authenticates a protected request", async () => {
        const login = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(login.status).toBe(200);
        expect(login.body).toEqual({ expiresIn: 3600 });
        const cookie = authCookie(login);
        const token = decodeURIComponent(cookie.slice("crm_access_token=".length));
        const claims = verifyToken(token);
        expect(claims).toMatchObject(payload);
        if (claims.iat === undefined) throw new Error("Expected JWT issue time.");
        expect(claims.exp - claims.iat).toBe(3600);
        expect(claims).not.toHaveProperty("employeeId");
        expect(claims).not.toHaveProperty("permVersion");
        expect(String(login.headers["set-cookie"])).toContain("Max-Age=3600");
        expect(String(login.headers["set-cookie"])).toContain("HttpOnly");
        expect(JSON.stringify(login.body)).not.toContain(token);
        expect(find).toHaveBeenCalledWith("admin@example.com");
        expect(update).toHaveBeenCalledExactlyOnceWith(payload.userId, expect.any(Date));
        const protectedResponse = await dispatchAuthRequest(app, "/api/protected", undefined, {
            cookie,
        });
        expect(protectedResponse.status).toBe(200);
        expect(protectedResponse.body).toEqual({ user: claims });
    });

    it("clears the cookie on logout, rejects requests without it and leaves a copied token valid", async () => {
        const login = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        const cookie = authCookie(login);
        const logout = await dispatchAuthRequest(app, "/api/auth/logout", undefined, { cookie });
        expect(logout.status).toBe(200);
        expect(logout.body).toEqual({ success: true, message: "Signed out successfully." });
        expect(String(logout.headers["set-cookie"])).toContain("crm_access_token=;");
        expect(String(logout.headers["set-cookie"])).toContain("Max-Age=0");
        const withoutCookie = await dispatchAuthRequest(app, "/api/protected");
        expect(withoutCookie.status).toBe(401);
        expect(withoutCookie.body).toEqual({
            success: false,
            code: "UNAUTHORIZED",
            message: "Authentication is required.",
            details: [],
        });
        expect(
            (await dispatchAuthRequest(app, "/api/protected", undefined, { cookie })).status,
        ).toBe(200);
    });

    it("rejects expired JWTs on logout and protected routes with TOKEN_STALE", async () => {
        const token = jwt.sign(payload, SECRET, { expiresIn: -1 });
        for (const path of ["/api/auth/logout", "/api/protected"]) {
            const result = await dispatchAuthRequest(app, path, undefined, {
                cookie: `crm_access_token=${token}`,
            });
            expect(result.status).toBe(401);
            expect(result.body).toEqual({
                success: false,
                code: "TOKEN_STALE",
                message: "Your session is no longer valid. Please sign in again.",
                details: [],
            });
            expect(String(result.headers["set-cookie"])).toContain("Max-Age=0");
        }
        expect(console.error).not.toHaveBeenCalled();
    });

    it("rejects forged JWTs without logging the token", async () => {
        const forged = jwt.sign(payload, "another-test-secret", { expiresIn: 3600 });
        const result = await dispatchAuthRequest(app, "/api/auth/logout", undefined, {
            cookie: `crm_access_token=${forged}`,
        });
        expect(result.status).toBe(401);
        expect(result.body).toMatchObject({ code: "UNAUTHORIZED" });
        expect(JSON.stringify(result.body)).not.toContain(forged);
        expect(console.error).not.toHaveBeenCalled();
    });

    it("uses a generic login failure for missing and inactive accounts with real bcrypt", async () => {
        find.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...account, isActive: false });
        const missing = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        const inactive = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(missing.status).toBe(401);
        expect(inactive.status).toBe(401);
        expect(missing.body).toEqual(inactive.body);
        expect(missing.body).toMatchObject({
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
        });
        expect(missing.headers["set-cookie"]).toBeUndefined();
        expect(update).not.toHaveBeenCalled();
    });

    it("sanitizes a missing signing configuration instead of returning secrets", async () => {
        vi.stubEnv("JWT_SECRET", undefined);
        const result = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(result.status).toBe(500);
        expect(result.body).toEqual({
            success: false,
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
            details: [],
        });
        expect(result.headers["set-cookie"]).toBeUndefined();
        expect(update).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledExactlyOnceWith("Authentication request failed.");
    });

    it("refuses to issue a token with a different lifetime than the auth cookie", async () => {
        await expect(authTokenService.issue(payload, 60)).rejects.toThrow(
            "Token lifetime must match",
        );
    });

    it("rejects a UserAccount role unsupported by CRM-102.2 before issuing a cookie", async () => {
        find.mockResolvedValue({ ...account, role: "UNKNOWN" });
        const result = await dispatchAuthRequest(app, "/api/auth/login", credentials);
        expect(result.status).toBe(500);
        expect(result.headers["set-cookie"]).toBeUndefined();
        expect(update).not.toHaveBeenCalled();
    });
});
