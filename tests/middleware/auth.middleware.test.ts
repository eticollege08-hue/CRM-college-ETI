import jwt from "jsonwebtoken";
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
