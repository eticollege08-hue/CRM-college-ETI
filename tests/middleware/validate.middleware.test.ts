import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { validateBody } from "../../src/middlewares/validate.middleware.js";
import { AuthError } from "../../src/modules/auth/auth.error.js";
import { authLoginSchema } from "../../src/modules/auth/auth.schema.js";
import { ApiError } from "../../src/utils/error.util.js";

import type { Request, Response } from "express";

function createHttpMocks(body: unknown) {
    const req = { body } as Request;
    const status = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();
    const res = { status, json } as unknown as Response;
    const next = vi.fn();

    return { req, res, next, status, json };
}

function getAuthError(http: ReturnType<typeof createHttpMocks>): AuthError {
    expect(http.next).toHaveBeenCalledTimes(1);
    expect(http.status).not.toHaveBeenCalled();
    expect(http.json).not.toHaveBeenCalled();

    const error: unknown = http.next.mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(AuthError);

    if (!(error instanceof AuthError)) {
        throw new Error("Expected an AuthError.");
    }

    return error;
}

describe("validateBody in auth mode", () => {
    it("accepts a short login password without trimming it", () => {
        const http = createHttpMocks({
            email: "  OLENA@EXAMPLE.COM  ",
            password: " x ",
        });

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        expect(http.req.body).toEqual({
            email: "olena@example.com",
            password: " x ",
        });
        expect(http.next).toHaveBeenCalledExactlyOnceWith();
        expect(http.json).not.toHaveBeenCalled();
    });

    describe.each([{ name: "login", schema: authLoginSchema }])(
        "$name body checks",
        ({ schema }) => {
            it.each([
                { label: "missing body", body: undefined },
                { label: "null", body: null },
                { label: "empty array", body: [] },
                { label: "non-empty array", body: [{ email: "olena@example.com" }] },
                { label: "string", body: "request-body" },
                { label: "number", body: 42 },
                { label: "boolean", body: false },
            ])("rejects $label with 400", ({ body }) => {
                const http = createHttpMocks(body);

                validateBody(schema, "auth")(http.req, http.res, http.next);

                const error = getAuthError(http);

                expect(error.status).toBe(400);
                expect(error.code).toBe("BAD_REQUEST");
                expect(error.message).toBe("Invalid request.");
                expect(error.details).toEqual([]);
            });
        },
    );

    it("reports both missing login fields for an empty object", () => {
        const http = createHttpMocks({});

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        const error = getAuthError(http);

        expect(error.status).toBe(422);
        expect(error.details).toHaveLength(2);
        expect(error.details).toEqual(
            expect.arrayContaining([
                { field: "email", message: "Email is required." },
                { field: "password", message: "Password is required." },
            ]),
        );
    });

    it("returns the exact invalid-email message from the contract", () => {
        const http = createHttpMocks({
            email: "not-an-email",
            password: "secret",
        });

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        const error = getAuthError(http);

        expect(error.status).toBe(422);
        expect(error.details).toEqual([
            { field: "email", message: "Enter a valid email address." },
        ]);
    });

    it("reports a non-string password without returning its value", () => {
        const http = createHttpMocks({
            email: "olena@example.com",
            password: { secret: "must-not-be-returned" },
        });

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        const error = getAuthError(http);

        expect(error.status).toBe(422);
        expect(error.details).toEqual([
            { field: "password", message: "Password must be a string." },
        ]);
        expect(JSON.stringify(error.details)).not.toContain("must-not-be-returned");
    });

    it("reports each additional property without returning its value", () => {
        const http = createHttpMocks({
            email: "olena@example.com",
            password: "secret",
            role: "OWNER",
            accessToken: "must-not-be-returned",
        });

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        const error = getAuthError(http);

        expect(error.status).toBe(422);
        expect(error.details).toHaveLength(2);
        expect(error.details).toEqual(
            expect.arrayContaining([
                { field: "role", message: "This field is not allowed." },
                { field: "accessToken", message: "This field is not allowed." },
            ]),
        );
        expect(JSON.stringify(error.details)).not.toContain("must-not-be-returned");
        expect(JSON.stringify(error.details)).not.toContain("OWNER");
    });

    it("uses a non-empty field identifier for an empty additional-property name", () => {
        const http = createHttpMocks({
            email: "olena@example.com",
            password: "secret",
            "": true,
        });

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        const error = getAuthError(http);

        expect(error.details).toEqual([{ field: "body", message: "This field is not allowed." }]);
    });

    it("does not replace req.body when validation fails", () => {
        const input = {
            email: "  INVALID  ",
            password: "secret",
        };
        const http = createHttpMocks(input);

        validateBody(authLoginSchema, "auth")(http.req, http.res, http.next);

        getAuthError(http);

        expect(http.req.body).toBe(input);
        expect(input.email).toBe("  INVALID  ");
    });
});

describe("validateBody in default mode", () => {
    const schema = z.object({
        name: z.string().trim().min(1),
    });

    it("preserves the existing error for an empty body", () => {
        const http = createHttpMocks({});

        validateBody(schema)(http.req, http.res, http.next);

        const error: unknown = http.next.mock.calls[0]?.[0];

        expect(error).toBeInstanceOf(ApiError);
        expect(error).not.toBeInstanceOf(AuthError);
        expect(error).toMatchObject({
            status: 400,
            message: "Тіло запиту є необхідним",
        });
        expect(http.json).not.toHaveBeenCalled();
    });

    it("preserves the existing validation response", () => {
        const http = createHttpMocks({ name: 42 });

        validateBody(schema)(http.req, http.res, http.next);

        expect(http.status).toHaveBeenCalledWith(400);
        expect(http.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка валідації даних",
            details: [
                {
                    field: "name",
                    message: expect.any(String),
                },
            ],
        });
        expect(http.next).not.toHaveBeenCalled();
    });

    it("continues to pass parsed data to the next middleware", () => {
        const http = createHttpMocks({ name: "  Olena  " });

        validateBody(schema)(http.req, http.res, http.next);

        expect(http.req.body).toEqual({ name: "Olena" });
        expect(http.next).toHaveBeenCalledExactlyOnceWith();
        expect(http.json).not.toHaveBeenCalled();
    });
});
