import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "../../src/modules/auth/auth.error.js";
import { createAuthOriginMiddleware } from "../../src/modules/auth/auth-origin.middleware.js";

import type { Request, Response } from "express";

const ALLOWED_ORIGIN = "https://crm.example.com";

function runMiddleware(headers: Record<string, string | string[]> = {}, method = "POST") {
    const req = { method, headers } as Request;
    const json = vi.fn();
    const res = { json } as unknown as Response;
    const next = vi.fn();

    const middleware = createAuthOriginMiddleware();
    middleware(req, res, next);

    return { next, json };
}

function expectForbidden(http: ReturnType<typeof runMiddleware>): void {
    expect(http.next).toHaveBeenCalledTimes(1);

    const error: unknown = http.next.mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
        details: [],
    });
    expect(http.json).not.toHaveBeenCalled();
}

beforeEach(() => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", `${ALLOWED_ORIGIN},http://localhost:3000`);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("auth origin middleware", () => {
    it.each([ALLOWED_ORIGIN, "http://localhost:3000"])(
        "allows the configured Origin %s",
        (origin) => {
            const http = runMiddleware({ origin });

            expect(http.next).toHaveBeenCalledExactlyOnceWith();
            expect(http.json).not.toHaveBeenCalled();
        },
    );

    it("allows a Referer from a configured origin when Origin is absent", () => {
        const http = runMiddleware({
            referer: `${ALLOWED_ORIGIN}/login?next=%2Fprojects`,
        });

        expect(http.next).toHaveBeenCalledExactlyOnceWith();
    });

    it("uses Origin even when Referer is not allowed", () => {
        const http = runMiddleware({
            origin: ALLOWED_ORIGIN,
            referer: "https://other.example.com/login",
        });

        expect(http.next).toHaveBeenCalledExactlyOnceWith();
    });

    it("rejects requests with neither Origin nor Referer", () => {
        expectForbidden(runMiddleware());
    });

    it.each([
        "",
        "null",
        "not-a-url",
        "https://other.example.com",
        "http://crm.example.com",
        "https://crm.example.com:8443",
        "https://crm.example.com.evil.example",
        "https://crm.example.com/login",
        `${ALLOWED_ORIGIN}, https://other.example.com`,
    ])("rejects Origin %s even with an allowed Referer", (origin) => {
        const http = runMiddleware({
            origin,
            referer: `${ALLOWED_ORIGIN}/login`,
        });

        expectForbidden(http);
    });

    it("rejects an Origin array", () => {
        const http = runMiddleware({
            origin: [ALLOWED_ORIGIN, "https://other.example.com"],
            referer: `${ALLOWED_ORIGIN}/login`,
        });

        expectForbidden(http);
    });

    it.each([
        "",
        "null",
        "/login",
        "not-a-url",
        "ftp://crm.example.com/login",
        "https://other.example.com/login",
        "http://crm.example.com/login",
        "https://crm.example.com:8443/login",
        "https://crm.example.com.evil.example/login",
        "https://user:password@crm.example.com/login",
        "https://crm.example.com@other.example.com/login",
        "https://crm.example.com\\login",
        "https://crm.example.com/login https://other.example.com",
    ])("rejects Referer %s", (referer) => {
        expectForbidden(runMiddleware({ referer }));
    });

    it("rejects a Referer array", () => {
        expectForbidden(
            runMiddleware({
                referer: [`${ALLOWED_ORIGIN}/login`],
            }),
        );
    });

    it("does not trust Host or forwarded headers as an allowed source", () => {
        const http = runMiddleware({
            host: "crm.example.com",
            "x-forwarded-host": "crm.example.com",
            "x-forwarded-proto": "https",
        });

        expectForbidden(http);
    });

    it.each(["GET", "OPTIONS"])("does not block %s requests", (method) => {
        const http = runMiddleware({}, method);

        expect(http.next).toHaveBeenCalledExactlyOnceWith();
    });

    it("fails during creation when configuration is missing", () => {
        vi.stubEnv("AUTH_ALLOWED_ORIGINS", undefined);

        expect(() => createAuthOriginMiddleware()).toThrow(
            "AUTH_ALLOWED_ORIGINS must contain at least one origin.",
        );
    });
});
