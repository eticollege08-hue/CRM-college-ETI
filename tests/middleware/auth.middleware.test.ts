import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAuth } from "../../src/middlewares/auth.middleware.js";
import { verifyToken } from "../../src/utils/jwt.util.js";

import type { Request, Response } from "express";
import type { JWT } from "../../src/types/common.types.js";

vi.mock("../../src/utils/jwt.util.js", () => ({ verifyToken: vi.fn() }));

function createRequestContext(token: unknown) {
    const req = { cookies: { crm_access_token: token } } as unknown as Request;
    const res = { clearCookie: vi.fn().mockReturnThis(), setHeader: vi.fn().mockReturnThis() };
    const next = vi.fn();
    return { req, res, next };
}

beforeEach(() => {
    vi.stubEnv("AUTH_COOKIE_SECURE", "true");
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe("isAuth (CRM-102.2)", () => {
    it.each([undefined, "", { userId: "invalid" }])(
        "rejects a missing, empty or non-string cookie %j",
        (token) => {
            const { req, res, next } = createRequestContext(token);
            isAuth(req, res as unknown as Response, next);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 401,
                    message: "Authentication is required.",
                    details: [],
                }),
            );
            expect(res.clearCookie).toHaveBeenCalledTimes(2);
            expect(verifyToken).not.toHaveBeenCalled();
        },
    );
    it.each([
        new jwt.JsonWebTokenError("invalid signature"),
        new jwt.NotBeforeError("not active", new Date()),
    ])("forwards generic 401 for invalid authentication", (error) => {
        vi.mocked(verifyToken).mockImplementationOnce(() => {
            throw error;
        });
        const { req, res, next } = createRequestContext("invalid");
        isAuth(req, res as unknown as Response, next);
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 401,
                message: "Authentication is required.",
                details: [],
            }),
        );
        expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
    it("handles expired authentication without exposing JWT details", () => {
        vi.mocked(verifyToken).mockImplementationOnce(() => {
            throw new jwt.TokenExpiredError("expired", new Date());
        });
        const { req, res, next } = createRequestContext("expired");
        isAuth(req, res as unknown as Response, next);
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 401,
                message: "Your session is no longer valid. Please sign in again.",
                details: [],
            }),
        );
        expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
    it("passes verified claims to the next handler", () => {
        const payload: JWT = {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            role: "OWNER",
            exp: 2000000000,
        };
        vi.mocked(verifyToken).mockReturnValueOnce(payload);
        const { req, res, next } = createRequestContext("valid");
        isAuth(req, res as unknown as Response, next);
        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledExactlyOnceWith();
        expect(res.clearCookie).not.toHaveBeenCalled();
    });
    it("forwards unexpected failures to the common error handler", () => {
        const error = new Error("Unexpected failure");
        vi.mocked(verifyToken).mockImplementationOnce(() => {
            throw error;
        });
        const { req, res, next } = createRequestContext("valid");
        isAuth(req, res as unknown as Response, next);
        expect(next).toHaveBeenCalledExactlyOnceWith(error);
        expect(res.clearCookie).not.toHaveBeenCalled();
    });
});
