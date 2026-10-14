import { describe, expect, it } from "vitest";

import { authLoginSchema } from "../../src/modules/auth/auth.schema.js";

describe("authLoginSchema", () => {
    it("normalizes email and accepts a short non-empty password", () => {
        const result = authLoginSchema.parse({
            email: "  OLENA@EXAMPLE.COM  ",
            password: "short",
        });

        expect(result).toEqual({
            email: "olena@example.com",
            password: "short",
        });
    });

    it("preserves password whitespace", () => {
        const result = authLoginSchema.parse({
            email: "olena@example.com",
            password: "  secret  ",
        });

        expect(result.password).toBe("  secret  ");
    });

    it.each([
        {},
        { email: "olena@example.com" },
        { password: "secret" },
        { email: "invalid", password: "secret" },
        { email: "olena@example.com", password: "" },
        { email: "olena@example.com", password: null },
        { email: "olena@example.com", password: "a".repeat(73) },
        { email: "olena@example.com", password: "я".repeat(37) },
        { email: "olena@example.com", password: "secret", unexpected: true },
    ])("rejects invalid input: %j", (input) => {
        expect(authLoginSchema.safeParse(input).success).toBe(false);
    });
});
