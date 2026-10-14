import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getJwtConfig } from "../../src/config/jwt.config.js";

beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "config-unit-test-secret");
    vi.stubEnv("JWT_EXPIRES_IN", undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getJwtConfig", () => {
    it("defaults to the cookie and login contract lifetime", () => {
        expect(getJwtConfig()).toEqual({ secret: "config-unit-test-secret", expiresIn: 3600 });
    });

    it.each([undefined, "", "   "])("rejects a missing or empty secret %s", (secret) => {
        vi.stubEnv("JWT_SECRET", secret);
        expect(() => getJwtConfig()).toThrow("JWT_SECRET must be configured.");
    });

    it("preserves the configured secret exactly", () => {
        vi.stubEnv("JWT_SECRET", " secret-with-spaces ");
        expect(getJwtConfig().secret).toBe(" secret-with-spaces ");
    });

    it.each(["", "0", "-1", "1.5", "abc", "3.6e3", " 3600 ", "9007199254740992"])(
        "rejects invalid lifetime %s",
        (value) => {
            vi.stubEnv("JWT_EXPIRES_IN", value);
            expect(() => getJwtConfig()).toThrow(
                "JWT_EXPIRES_IN must be a positive integer in seconds.",
            );
        },
    );

    it("rejects a JWT lifetime that disagrees with expiresIn and cookie Max-Age", () => {
        vi.stubEnv("JWT_EXPIRES_IN", "7200");
        expect(() => getJwtConfig()).toThrow(
            "JWT_EXPIRES_IN must be 3600 seconds to match the auth contract.",
        );
    });
});
