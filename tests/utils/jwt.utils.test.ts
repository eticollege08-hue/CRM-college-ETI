import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateToken, verifyToken } from "../../src/utils/jwt.util.js";

const SECRET = "jwt-unit-test-only-secret";
const payload = { userId: "550e8400-e29b-41d4-a716-446655440000", role: "OWNER" } as const;

beforeEach(() => {
    vi.stubEnv("JWT_SECRET", SECRET);
    vi.stubEnv("JWT_EXPIRES_IN", "3600");
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("CRM-102.2 JWT signing and verification", () => {
    it("signs account claims and verifies a one-hour expiry without mutating input", () => {
        const before = Math.floor(Date.now() / 1000);
        const token = generateToken(payload);
        const verified = verifyToken(token);
        expect(verified).toMatchObject(payload);
        expect(verified.exp).toBeGreaterThanOrEqual(before + 3600);
        expect(verified.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600);
        expect(verified.iat).toBeDefined();
        if (verified.iat === undefined) throw new Error("Expected issue time.");
        expect(verified.exp - verified.iat).toBe(3600);
        expect(payload).not.toHaveProperty("exp");
        expect(verified).not.toHaveProperty("employeeId");
        expect(verified).not.toHaveProperty("permVersion");
    });

    it.each(["OWNER", "MANAGER", "RECRUITER", "HR", "WORKER"] as const)(
        "supports the CRM-102.2 role %s",
        (role) => {
            expect(verifyToken(generateToken({ ...payload, role })).role).toBe(role);
        },
    );

    it("reads configuration after import rather than capturing env during module loading", () => {
        vi.stubEnv("JWT_SECRET", "different-unit-test-secret");
        const token = generateToken(payload);
        expect(jwt.verify(token, "different-unit-test-secret")).toMatchObject(payload);
        expect(() => jwt.verify(token, SECRET)).toThrow(jwt.JsonWebTokenError);
    });

    it("rejects a forged signature", () => {
        const token = jwt.sign(payload, "forged-unit-test-secret", { expiresIn: 3600 });
        expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
    });

    it("rejects an expired token", () => {
        const token = jwt.sign(payload, SECRET, { expiresIn: -1 });
        expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
    });

    it("rejects a token that is not active yet", () => {
        const token = jwt.sign(payload, SECRET, { expiresIn: 3600, notBefore: 60 });
        expect(() => verifyToken(token)).toThrow(jwt.NotBeforeError);
    });

    it("accepts only the signing algorithm used by this module", () => {
        const token = jwt.sign(payload, SECRET, { algorithm: "HS384", expiresIn: 3600 });
        expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
    });

    it.each(["", "invalid-token", "a.b.c"])("rejects malformed JWT %s", (token) => {
        expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
    });

    it.each([
        { role: "OWNER" },
        { ...payload, userId: "invalid-id" },
        { ...payload, role: "UNKNOWN" },
        { ...payload, employeeId: "not-used" },
        { ...payload, permVersion: 1 },
    ])("rejects a correctly signed but invalid payload %j", (claims) => {
        const token = jwt.sign(claims, SECRET, { expiresIn: 3600 });
        expect(() => verifyToken(token)).toThrow("Invalid token payload.");
    });

    it("requires an expiry even on a correctly signed token", () => {
        expect(() => verifyToken(jwt.sign(payload, SECRET))).toThrow("Invalid token payload.");
    });

    it("rejects signed string payloads", () => {
        expect(() => verifyToken(jwt.sign("string-payload", SECRET))).toThrow(
            "Invalid token payload.",
        );
    });

    it("validates the account ID before signing", () => {
        expect(() => generateToken({ ...payload, userId: "invalid-id" })).toThrow();
    });
});
