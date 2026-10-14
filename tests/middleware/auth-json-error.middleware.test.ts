import { beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../../src/middlewares/error.middleware.js";
import { AuthError } from "../../src/modules/auth/auth.error.js";

import type { Request, Response } from "express";

const SENSITIVE_VALUE = "example-sensitive-value-not-a-real-secret";

function createParseError() {
    return Object.assign(new SyntaxError(`Invalid JSON near ${SENSITIVE_VALUE}`), {
        status: 400,
        type: "entity.parse.failed",
        body: `{"password":"${SENSITIVE_VALUE}","token":"${SENSITIVE_VALUE}"`,
    });
}

function createHttpMocks(path = "/api/auth/login", method = "POST") {
    const req = {
        path,
        method,
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

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("auth JSON parsing errors", () => {
    it.each(["/api/auth/login", "/api/auth/logout", "/api/auth/login/", "/API/AUTH/LOGIN"])(
        "returns a safe 400 response for POST %s",
        (path) => {
            const http = createHttpMocks(path);

            errorHandler(createParseError(), http.req, http.res, http.next);

            expect(http.status).toHaveBeenCalledWith(400);
            expect(http.json).toHaveBeenCalledExactlyOnceWith({
                success: false,
                code: "BAD_REQUEST",
                message: "Invalid request.",
                details: [],
            });
            expect(http.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
            expect(http.render).not.toHaveBeenCalled();
            expect(http.next).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
            expect(JSON.stringify(http.json.mock.calls)).not.toContain(SENSITIVE_VALUE);
        },
    );

    it("forwards only the sanitized error when headers were already sent", () => {
        const http = createHttpMocks();
        Object.defineProperty(http.res, "headersSent", { value: true });
        const originalError = createParseError();

        errorHandler(originalError, http.req, http.res, http.next);

        expect(http.next).toHaveBeenCalledTimes(1);

        const forwarded: unknown = http.next.mock.calls[0]?.[0];

        expect(forwarded).toBeInstanceOf(AuthError);
        expect(forwarded).not.toBe(originalError);

        if (!(forwarded instanceof AuthError)) {
            throw new Error("Expected a sanitized AuthError.");
        }

        expect(forwarded.status).toBe(400);
        expect(forwarded.code).toBe("BAD_REQUEST");
        expect(forwarded.message).toBe("Invalid request.");
        expect(forwarded).not.toHaveProperty("body");
        expect(forwarded).not.toHaveProperty("cause");
        expect(forwarded.stack).not.toContain(SENSITIVE_VALUE);

        expect(http.status).not.toHaveBeenCalled();
        expect(http.json).not.toHaveBeenCalled();
        expect(http.setHeader).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });

    it("does not classify an ordinary SyntaxError as malformed request JSON", () => {
        const http = createHttpMocks();
        const error = new SyntaxError("Internal parsing failure");

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(500);
        expect(http.json).toHaveBeenCalledWith({
            success: false,
            message: "Internal server error",
        });
        expect(console.error).toHaveBeenCalledWith(error);
    });

    it("does not classify an unrelated error type as malformed request JSON", () => {
        const http = createHttpMocks();
        const error = Object.assign(new SyntaxError("Internal failure"), {
            status: 400,
            type: "internal.failure",
        });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(500);
        expect(console.error).toHaveBeenCalledWith(error);
    });

    it("requires the parser error status to be 400", () => {
        const http = createHttpMocks();
        const error = Object.assign(new SyntaxError("Internal failure"), {
            status: 500,
            type: "entity.parse.failed",
        });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(500);
        expect(console.error).toHaveBeenCalledWith(error);
    });

    it.each(["/api/employees", "/api/auth/login-extra", "/api/auth/login/details"])(
        "preserves existing handling outside the auth endpoints: %s",
        (path) => {
            const http = createHttpMocks(path);
            const error = Object.assign(new SyntaxError("Malformed JSON"), {
                status: 400,
                type: "entity.parse.failed",
            });

            errorHandler(error, http.req, http.res, http.next);

            expect(http.status).toHaveBeenCalledWith(500);
            expect(http.json).toHaveBeenCalledWith({
                success: false,
                message: "Internal server error",
            });
            expect(console.error).toHaveBeenCalledWith(error);
        },
    );

    it("does not apply the auth POST rule to other HTTP methods", () => {
        const http = createHttpMocks("/api/auth/login", "GET");
        const error = Object.assign(new SyntaxError("Malformed JSON"), {
            status: 400,
            type: "entity.parse.failed",
        });

        errorHandler(error, http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(500);
        expect(console.error).toHaveBeenCalledWith(error);
    });
});
