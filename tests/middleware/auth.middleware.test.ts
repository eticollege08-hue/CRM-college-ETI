import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAuth } from "../../src/middlewares/auth.middleware.js";
import { generateToken } from "../../src/utils/jwt.util.js";

import type { Request, Response } from "express";

const SECRET = "middleware-unit-test-secret";
const payload = { userId: "550e8400-e29b-41d4-a716-446655440000", role: "OWNER" } as const;

function createRequestContext(token?: unknown) {
    const req = { cookies: { crm_access_token: token }, headers: {} } as unknown as Request;
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    return { req, res, next };
}

beforeEach(() => {
    vi.stubEnv("JWT_SECRET", SECRET);
    vi.stubEnv("JWT_EXPIRES_IN", "3600");
    vi.stubEnv("AUTH_COOKIE_SECURE", "true");
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("isAuth with real CRM-102.2 verification", () => {
    it.each([undefined, "", 42, { userId: "invalid" }])(
        "rejects a missing or non-string cookie %j",
        (token) => {
            const http = createRequestContext(token);
            isAuth(http.req, http.res as unknown as Response, http.next);
            expect(http.res.status).toHaveBeenCalledWith(401);
            expect(http.res.json).toHaveBeenCalledWith({
import { describe, expect, it, vi } from "vitest";

import { isAuth } from "../../src/middlewares/auth.middleware.js";
import { verifyToken } from "../../src/utils/jwt.util.js";

import type { Request, Response } from "express";
import type { JWT } from "../../src/types/common.types.js";

vi.mock("../../src/utils/jwt.util.js", () => ({
    verifyToken: vi.fn(),
}));

function createRequestContext(cookies: Record<string, unknown> = {}) {
    const req = { cookies } as Request;
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    return { req, res, next };
}

describe("isAuth", () => {
    it.each([undefined, "", { userId: "invalid" }])(
        "rejects a missing, empty or non-string cookie: %j",
        (token) => {
            const { req, res, next } = createRequestContext({ crm_access_token: token });

            isAuth(req, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "UNAUTHORIZED",
                message: "Authentication is required.",
                details: [],
            });
            expect(http.res.cookie).toHaveBeenCalledWith("crm_access_token", "", {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                path: "/api",
                maxAge: 0,
            });
            expect(http.res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
            expect(http.next).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        },
    );

    it("passes verified account claims to the next handler", () => {
        const http = createRequestContext(generateToken(payload));
        isAuth(http.req, http.res as unknown as Response, http.next);
        expect(http.req.user).toMatchObject(payload);
        expect(http.next).toHaveBeenCalledExactlyOnceWith();
        expect(http.res.cookie).not.toHaveBeenCalled();
        expect(http.res.json).not.toHaveBeenCalled();
    });

    it.each([
        "malformed-token",
        jwt.sign(payload, "different-test-secret", { expiresIn: 3600 }),
        jwt.sign(payload, SECRET, { expiresIn: 3600, notBefore: 60 }),
        jwt.sign({ ...payload, role: "UNKNOWN" }, SECRET, { expiresIn: 3600 }),
    ])("rejects invalid or not-yet-active JWT without logging it", (token) => {
        const http = createRequestContext(token);
        isAuth(http.req, http.res as unknown as Response, http.next);
        expect(http.res.status).toHaveBeenCalledWith(401);
        expect(http.res.json).toHaveBeenCalledWith({
            expect(res.clearCookie).toHaveBeenCalledWith("crm_access_token", { path: "/api" });
            expect(verifyToken).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        },
    );

    it.each([
        new jwt.JsonWebTokenError("invalid signature"),
        new jwt.NotBeforeError("jwt not active", new Date()),
    ])("returns UNAUTHORIZED for an invalid or not-yet-active token", (error) => {
        const { req, res, next } = createRequestContext({ crm_access_token: "invalid-token" });
        vi.mocked(verifyToken).mockImplementationOnce(() => {
            throw error;
        });

        isAuth(req, res as unknown as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: "UNAUTHORIZED",
            message: "Authentication is required.",
            details: [],
        });
        expect(http.res.cookie).toHaveBeenCalled();
        expect(http.next).not.toHaveBeenCalled();
        expect(http.req.user).toBeUndefined();
        expect(console.error).not.toHaveBeenCalled();
    });

    it("returns TOKEN_STALE for expiry and clears the cookie", () => {
        const http = createRequestContext(jwt.sign(payload, SECRET, { expiresIn: -1 }));
        isAuth(http.req, http.res as unknown as Response, http.next);
        expect(http.res.json).toHaveBeenCalledWith({
        expect(res.clearCookie).toHaveBeenCalledWith("crm_access_token", { path: "/api" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns TOKEN_STALE and clears the cookie for an expired token", () => {
        const { req, res, next } = createRequestContext({ crm_access_token: "expired-token" });
        vi.mocked(verifyToken).mockImplementationOnce(() => {
            throw new jwt.TokenExpiredError("jwt expired", new Date());
        });

        isAuth(req, res as unknown as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: "TOKEN_STALE",
            message: "Your session is no longer valid. Please sign in again.",
            details: [],
        });
        expect(http.res.status).toHaveBeenCalledWith(401);
        expect(http.res.cookie).toHaveBeenCalled();
        expect(http.next).not.toHaveBeenCalled();
    });

    it("ignores Authorization headers when the cookie is missing", () => {
        const http = createRequestContext();
        http.req.headers.authorization = `Bearer ${generateToken(payload)}`;
        isAuth(http.req, http.res as unknown as Response, http.next);
        expect(http.res.status).toHaveBeenCalledWith(401);
        expect(http.next).not.toHaveBeenCalled();
    });

    it("forwards configuration failures without returning them to the client or logging secrets", () => {
        const http = createRequestContext(generateToken(payload));
        vi.stubEnv("JWT_SECRET", undefined);
        isAuth(http.req, http.res as unknown as Response, http.next);
        expect(http.next).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ message: "JWT_SECRET must be configured." }),
        );
        expect(http.res.json).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalledWith("crm_access_token", { path: "/api" });
        expect(next).not.toHaveBeenCalled();
    });

    it("passes the verified user to the next handler without clearing the cookie", () => {
        const { req, res, next } = createRequestContext({ crm_access_token: "valid-token" });
        const payload: JWT = {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            role: "OWNER",
            exp: 2000000000,
        };
        vi.mocked(verifyToken).mockReturnValueOnce(payload);

        isAuth(req, res as unknown as Response, next);

        expect(verifyToken).toHaveBeenCalledWith("valid-token");
        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledExactlyOnceWith();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.clearCookie).not.toHaveBeenCalled();
    });

    it("forwards unexpected errors to the error handler", () => {
        const { req, res, next } = createRequestContext({ crm_access_token: "valid-token" });
        const error = new Error("Unexpected verification failure");
        vi.mocked(verifyToken).mockImplementationOnce(() => {
            throw error;
        });

        isAuth(req, res as unknown as Response, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.clearCookie).not.toHaveBeenCalled();
    });
});
