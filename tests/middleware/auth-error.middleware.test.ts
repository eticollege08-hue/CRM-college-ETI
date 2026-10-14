import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../../src/middlewares/error.middleware.js";
import { AuthError } from "../../src/modules/auth/auth.error.js";
import { ApiError } from "../../src/utils/error.util.js";

import type { Request, Response } from "express";

function createHttpMocks() {
    const req = {
        path: "/api/auth/login",
        headers: {},
        xhr: false,
    } as Request;

    const status = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();
    const setHeader = vi.fn().mockReturnThis();
    const render = vi.fn().mockReturnThis();

    const res = {
        headersSent: false,
        status,
        json,
        setHeader,
        render,
    } as unknown as Response;

    const next = vi.fn();

    return { req, res, next, status, json, setHeader, render };
}

describe("auth errors in errorHandler", () => {
    it.each([
        {
            kind: "BAD_REQUEST",
            status: 400,
            code: "BAD_REQUEST",
            message: "Invalid request.",
        },
        {
            kind: "UNAUTHORIZED",
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication is required.",
        },
        {
            kind: "INVALID_CREDENTIALS",
            status: 401,
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
        },
        {
            kind: "TOKEN_STALE",
            status: 401,
            code: "TOKEN_STALE",
            message: "Your session is no longer valid. Please sign in again.",
        },
        {
            kind: "FORBIDDEN",
            status: 403,
            code: "FORBIDDEN",
            message: "You do not have permission to perform this action.",
        },
        {
            kind: "INTERNAL_SERVER_ERROR",
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
        },
    ] as const)("returns the contract response for $kind", (testCase) => {
        const http = createHttpMocks();
        const error = new AuthError({ kind: testCase.kind });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(testCase.status);
        expect(http.json).toHaveBeenCalledWith({
            success: false,
            code: testCase.code,
            message: testCase.message,
            details: [],
        });
        expect(http.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(http.setHeader).not.toHaveBeenCalledWith("Retry-After", expect.anything());
        expect(http.next).not.toHaveBeenCalled();
        expect(http.render).not.toHaveBeenCalled();
    });

    it("returns 422 with field-level details", () => {
        const http = createHttpMocks();
        const error = new AuthError({
            kind: "VALIDATION_ERROR",
            details: [
                {
                    field: "email",
                    message: "Enter a valid email address.",
                },
            ],
        });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(422);
        expect(http.json).toHaveBeenCalledWith({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            details: [
                {
                    field: "email",
                    message: "Enter a valid email address.",
                },
            ],
        });
    });

    it("returns 429 with Retry-After in seconds", () => {
        const http = createHttpMocks();
        const error = new AuthError({
            kind: "TOO_MANY_ATTEMPTS",
            retryAfterSeconds: 60,
        });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(429);
        expect(http.setHeader).toHaveBeenCalledWith("Retry-After", "60");
        expect(http.json).toHaveBeenCalledWith({
            success: false,
            code: "TOO_MANY_ATTEMPTS",
            message: "Too many attempts. Please try again later.",
            details: [],
        });
    });

    it.each([0, -1, 1.5, NaN, Infinity])("rejects invalid retry time %s", (retryAfterSeconds) => {
        expect(
            () =>
                new AuthError({
                    kind: "TOO_MANY_ATTEMPTS",
                    retryAfterSeconds,
                }),
        ).toThrow("retryAfterSeconds must be a positive safe integer.");
    });

    it("does not copy extra properties from validation details", () => {
        const http = createHttpMocks();
        const detail = {
            field: "password",
            message: "Password is required.",
            value: "secret-value-must-not-be-returned",
        };
        const error = new AuthError({
            kind: "VALIDATION_ERROR",
            details: [detail],
        });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.json).toHaveBeenCalledWith({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            details: [
                {
                    field: "password",
                    message: "Password is required.",
                },
            ],
        });
    });

    it("does not log expected auth errors", () => {
        const http = createHttpMocks();
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const error = new AuthError({ kind: "INVALID_CREDENTIALS" });

        errorHandler(error, http.req, http.res, http.next);

        expect(log).not.toHaveBeenCalled();
    });

    it("forwards the error if response headers have already been sent", () => {
        const http = createHttpMocks();
        Object.defineProperty(http.res, "headersSent", { value: true });
        const error = new AuthError({ kind: "BAD_REQUEST" });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.next).toHaveBeenCalledWith(error);
        expect(http.status).not.toHaveBeenCalled();
        expect(http.json).not.toHaveBeenCalled();
        expect(http.setHeader).not.toHaveBeenCalled();
    });

    it("preserves the existing JSON format for ordinary ApiError", () => {
        const http = createHttpMocks();
        const error = new ApiError(404, "Record not found");

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(404);
        expect(http.json).toHaveBeenCalledWith({
            success: false,
            message: "Record not found",
        });
        expect(http.setHeader).not.toHaveBeenCalled();
    });

    it("preserves SSR handling for ordinary ApiError", () => {
        const http = createHttpMocks();
        const req = {
            path: "/employees",
            headers: {},
            xhr: false,
        } as Request;
        const error = new ApiError(404, "Record not found");

        errorHandler(error, req, http.res, http.next);

        expect(http.render).toHaveBeenCalledWith("error", {
            success: false,
            status: 404,
            message: "Record not found",
        });
        expect(http.json).not.toHaveBeenCalled();
    });
});
