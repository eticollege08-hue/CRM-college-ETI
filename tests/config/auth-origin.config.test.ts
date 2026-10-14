import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthAllowedOrigins } from "../../src/config/auth.config.js";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getAuthAllowedOrigins", () => {
    it("reads multiple origins and removes duplicates", () => {
        vi.stubEnv(
            "AUTH_ALLOWED_ORIGINS",
            " https://crm.example.com, http://localhost:3000, https://crm.example.com ",
        );

        expect(getAuthAllowedOrigins()).toEqual([
            "https://crm.example.com",
            "http://localhost:3000",
        ]);
    });

    it.each([undefined, "", "   "])("rejects missing or empty configuration: %s", (value) => {
        vi.stubEnv("AUTH_ALLOWED_ORIGINS", value);

        expect(() => getAuthAllowedOrigins()).toThrow(
            "AUTH_ALLOWED_ORIGINS must contain at least one origin.",
        );
    });

    it.each([
        "*",
        "null",
        "crm.example.com",
        "ftp://crm.example.com",
        "https://*.example.com",
        "https://crm.example.com/",
        "https://crm.example.com/login",
        "https://crm.example.com?query=value",
        "https://crm.example.com#fragment",
        "https://user:password@crm.example.com",
        "https://crm.example.com,",
        "https://crm.example.com,,http://localhost:3000",
        "https://crm.example.com https://other.example.com",
    ])("rejects invalid configuration: %s", (value) => {
        vi.stubEnv("AUTH_ALLOWED_ORIGINS", value);

        expect(() => getAuthAllowedOrigins()).toThrow(
            "AUTH_ALLOWED_ORIGINS must contain comma-separated canonical HTTP(S) origins without paths, credentials or wildcards.",
        );
    });
});
