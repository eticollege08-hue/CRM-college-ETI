import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthCookieSecure } from "../../src/config/auth.config.js";

beforeEach(() => {
    vi.stubEnv("AUTH_COOKIE_SECURE", undefined);
    vi.stubEnv("NODE_ENV", undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getAuthCookieSecure", () => {
    it("defaults to secure cookies", () => {
        expect(getAuthCookieSecure()).toBe(true);
    });

    it("keeps secure cookies enabled in development by default", () => {
        vi.stubEnv("NODE_ENV", "development");

        expect(getAuthCookieSecure()).toBe(true);
    });

    it("accepts explicit secure cookies in production", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("AUTH_COOKIE_SECURE", "true");

        expect(getAuthCookieSecure()).toBe(true);
    });

    it("allows explicitly disabled Secure in development", () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("AUTH_COOKIE_SECURE", "false");

        expect(getAuthCookieSecure()).toBe(false);
    });

    it.each(["production", "staging", "test", undefined])(
        "rejects disabled Secure when NODE_ENV is %s",
        (environment) => {
            vi.stubEnv("NODE_ENV", environment);
            vi.stubEnv("AUTH_COOKIE_SECURE", "false");

            expect(() => getAuthCookieSecure()).toThrow(
                "AUTH_COOKIE_SECURE=false is allowed only in development.",
            );
        },
    );

    it.each(["", "TRUE", "FALSE", "1", "0", " true "])(
        "rejects invalid configuration %s",
        (value) => {
            vi.stubEnv("AUTH_COOKIE_SECURE", value);

            expect(() => getAuthCookieSecure()).toThrow(
                "AUTH_COOKIE_SECURE must be true or false.",
            );
        },
    );
});
