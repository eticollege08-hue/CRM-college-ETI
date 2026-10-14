import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAuthCookie, setAuthCookie } from "../../src/modules/auth/auth-cookie.util.js";

import type { Response } from "express";

const TEST_TOKEN = "example-token-not-a-real-credential";

function createResponseMock() {
    const append = vi.fn().mockReturnThis();
    const setHeader = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();

    const res = {
        req: {},
        cookie: express.response.cookie,
        append,
        setHeader,
        json,
    } as unknown as Response;

    return { res, append, setHeader, json };
}

function readSetCookie(http: ReturnType<typeof createResponseMock>): string {
    expect(http.append).toHaveBeenCalledTimes(1);
    expect(http.append).toHaveBeenCalledWith("Set-Cookie", expect.any(String));

    const header: unknown = http.append.mock.calls[0]?.[1];

    if (typeof header !== "string") {
        throw new Error("Expected a Set-Cookie header.");
    }

    return header;
}

beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_COOKIE_SECURE", undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("setAuthCookie", () => {
    it("sets a host-only secure cookie for exactly 3600 seconds", () => {
        const http = createResponseMock();

        setAuthCookie(http.res, TEST_TOKEN);

        const header = readSetCookie(http);
        const attributes = header.split("; ");

        expect(attributes).toEqual(
            expect.arrayContaining([
                `crm_access_token=${TEST_TOKEN}`,
                "Max-Age=3600",
                "Path=/api",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
            ]),
        );
        expect(header).not.toMatch(/(?:^|;\s*)Domain=/i);
        expect(http.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(http.json).not.toHaveBeenCalled();
    });

    it("omits Secure only when explicitly configured for development", () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("AUTH_COOKIE_SECURE", "false");
        const http = createResponseMock();

        setAuthCookie(http.res, TEST_TOKEN);

        const attributes = readSetCookie(http).split("; ");

        expect(attributes).not.toContain("Secure");
        expect(attributes).toEqual(
            expect.arrayContaining(["HttpOnly", "SameSite=Lax", "Path=/api", "Max-Age=3600"]),
        );
    });

    it("rejects an empty token without writing headers", () => {
        const http = createResponseMock();

        expect(() => setAuthCookie(http.res, "")).toThrow("Auth token must not be empty.");

        expect(http.append).not.toHaveBeenCalled();
        expect(http.setHeader).not.toHaveBeenCalled();
    });

    it("rejects insecure production configuration without writing headers", () => {
        vi.stubEnv("AUTH_COOKIE_SECURE", "false");
        const http = createResponseMock();

        expect(() => setAuthCookie(http.res, TEST_TOKEN)).toThrow(
            "AUTH_COOKIE_SECURE=false is allowed only in development.",
        );

        expect(http.append).not.toHaveBeenCalled();
        expect(http.setHeader).not.toHaveBeenCalled();
    });
});

describe("clearAuthCookie", () => {
    it("clears the cookie using an empty value and Max-Age=0", () => {
        const http = createResponseMock();

        clearAuthCookie(http.res);

        const header = readSetCookie(http);
        const attributes = header.split("; ");

        expect(attributes).toEqual(
            expect.arrayContaining([
                "crm_access_token=",
                "Max-Age=0",
                "Path=/api",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
            ]),
        );
        expect(header).not.toMatch(/(?:^|;\s*)Domain=/i);
        expect(header).not.toContain(TEST_TOKEN);
        expect(http.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(http.json).not.toHaveBeenCalled();
    });

    it.each([
        { environment: "production", secure: "true" },
        { environment: "development", secure: "false" },
    ])("uses matching cookie scope and flags in $environment", ({ environment, secure }) => {
        vi.stubEnv("NODE_ENV", environment);
        vi.stubEnv("AUTH_COOKIE_SECURE", secure);
        const login = createResponseMock();
        const logout = createResponseMock();

        setAuthCookie(login.res, TEST_TOKEN);
        clearAuthCookie(logout.res);

        const loginAttributes = readSetCookie(login).split("; ");
        const logoutAttributes = readSetCookie(logout).split("; ");

        for (const attribute of ["Path=/api", "HttpOnly", "Secure", "SameSite=Lax"]) {
            expect(logoutAttributes.includes(attribute)).toBe(loginAttributes.includes(attribute));
        }

        expect(loginAttributes).toContain("Max-Age=3600");
        expect(logoutAttributes).toContain("Max-Age=0");
    });

    it("rejects insecure production configuration without writing headers", () => {
        vi.stubEnv("AUTH_COOKIE_SECURE", "false");
        const http = createResponseMock();

        expect(() => clearAuthCookie(http.res)).toThrow(
            "AUTH_COOKIE_SECURE=false is allowed only in development.",
        );

        expect(http.append).not.toHaveBeenCalled();
        expect(http.setHeader).not.toHaveBeenCalled();
    });
});
