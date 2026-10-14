import { afterEach, describe, expect, it, vi } from "vitest";

import { getBcryptCost } from "../../src/config/auth.config.js";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getBcryptCost", () => {
    it("uses 12 when BCRYPT_COST is not configured", () => {
        vi.stubEnv("BCRYPT_COST", undefined);

        expect(getBcryptCost()).toBe(12);
    });

    it.each(["4", "10", "12", "31"])("accepts the configured cost %s", (value) => {
        vi.stubEnv("BCRYPT_COST", value);

        expect(getBcryptCost()).toBe(Number(value));
    });

    it.each(["", "abc", "3", "32", "-1", "12.5", "1e1", " 12 "])(
        "rejects invalid configuration: %s",
        (value) => {
            vi.stubEnv("BCRYPT_COST", value);

            expect(() => getBcryptCost()).toThrow(
                "BCRYPT_COST must be an integer between 4 and 31.",
            );
        },
    );
});
