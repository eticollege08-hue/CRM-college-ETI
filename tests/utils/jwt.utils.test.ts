import { afterEach, describe, expect, it, vi } from "vitest";

import type { JWTPayload } from "../../src/types/common.types.js";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe("generateToken (CRM-102.2)", () => {
    it("adds a one-hour expiration to a payload without exp", async () => {
        vi.resetModules();
        vi.stubEnv("JWT_SECRET", "unit-test-only-secret-with-at-least-32-bytes");
        vi.stubEnv("JWT_EXPIRES_IN", "3600");
        const { generateToken, verifyToken } = await import("../../src/utils/jwt.util.js");
        const payload: JWTPayload = {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            role: "OWNER",
        };
        const before = Math.floor(Date.now() / 1000);
        const verified = verifyToken(generateToken(payload));
        expect(verified).toMatchObject(payload);
        expect(verified.exp).toBeGreaterThanOrEqual(before + 3600);
        expect(verified.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600);
        expect(payload).not.toHaveProperty("exp");
    });
});
