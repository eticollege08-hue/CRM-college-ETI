import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLoginRateLimitConfig } from "../../src/config/auth.config.js";

beforeEach(() => {
    vi.stubEnv("LOGIN_MAX_FAILED_ATTEMPTS", undefined);
    vi.stubEnv("LOGIN_ATTEMPT_WINDOW_SECONDS", undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getLoginRateLimitConfig", () => {
    it("defaults to 5 failed attempts within 5 minutes", () => {
        expect(getLoginRateLimitConfig()).toEqual({
            maxAttempts: 5,
            windowMs: 300_000,
        });
    });

    it("reads environment variables and converts seconds to milliseconds", () => {
        vi.stubEnv("LOGIN_MAX_FAILED_ATTEMPTS", "3");
        vi.stubEnv("LOGIN_ATTEMPT_WINDOW_SECONDS", "60");

        expect(getLoginRateLimitConfig()).toEqual({
            maxAttempts: 3,
            windowMs: 60_000,
        });
    });

    describe.each(["LOGIN_MAX_FAILED_ATTEMPTS", "LOGIN_ATTEMPT_WINDOW_SECONDS"])("%s", (name) => {
        it.each(["", "0", "-1", "1.5", "abc", "1e2", " 5 ", "9007199254740992"])(
            "rejects invalid value %s",
            (value) => {
                vi.stubEnv(name, value);

                expect(() => getLoginRateLimitConfig()).toThrow(
                    `${name} must be a positive safe integer.`,
                );
            },
        );
    });

    it("rejects a window that overflows when converted to milliseconds", () => {
        vi.stubEnv("LOGIN_ATTEMPT_WINDOW_SECONDS", "9007199254740991");

        expect(() => getLoginRateLimitConfig()).toThrow(
            "LOGIN_ATTEMPT_WINDOW_SECONDS is too large.",
        );
    });
});
