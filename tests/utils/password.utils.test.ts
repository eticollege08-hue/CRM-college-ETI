import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "../../src/utils/password.util.js";

beforeEach(() => {
    vi.stubEnv("BCRYPT_COST", "4");
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("hashPassword", () => {
    it("creates a bcrypt hash using the configured cost", async () => {
        const password = "ExamplePassword123!";

        const hash = await hashPassword(password);

        expect(hash).not.toBe(password);
        expect(bcrypt.getRounds(hash)).toBe(4);
        expect(await bcrypt.compare(password, hash)).toBe(true);
    });

    it("uses a different salt for each hash", async () => {
        const password = "ExamplePassword123!";

        const firstHash = await hashPassword(password);
        const secondHash = await hashPassword(password);

        expect(firstHash).not.toBe(secondHash);
        expect(await verifyPassword(password, firstHash)).toBe(true);
        expect(await verifyPassword(password, secondHash)).toBe(true);
    });

    it("accepts a Unicode password of exactly 72 UTF-8 bytes", async () => {
        const password = "я".repeat(36);

        const hash = await hashPassword(password);

        expect(await verifyPassword(password, hash)).toBe(true);
    });

    it("rejects a password exceeding 72 UTF-8 bytes", async () => {
        await expect(hashPassword("я".repeat(37))).rejects.toThrow(
            "Password must contain between 1 and 72 UTF-8 bytes.",
        );
    });

    it("rejects an empty password", async () => {
        await expect(hashPassword("")).rejects.toThrow(
            "Password must contain between 1 and 72 UTF-8 bytes.",
        );
    });

    it("rejects an invalid bcrypt configuration", async () => {
        vi.stubEnv("BCRYPT_COST", "invalid");

        await expect(hashPassword("ExamplePassword123!")).rejects.toThrow(
            "BCRYPT_COST must be an integer between 4 and 31.",
        );
    });
});

describe("verifyPassword", () => {
    it("rejects an incorrect password", async () => {
        const hash = await hashPassword("ExamplePassword123!");

        expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
    });

    it("preserves whitespace and letter case", async () => {
        const password = "  ExamplePassword123!  ";
        const hash = await hashPassword(password);

        expect(await verifyPassword(password, hash)).toBe(true);
        expect(await verifyPassword(password.trim(), hash)).toBe(false);
        expect(await verifyPassword(password.toLowerCase(), hash)).toBe(false);
    });

    it("rejects a longer password sharing the first 72 bytes", async () => {
        const password = "a".repeat(72);
        const hash = await hashPassword(password);

        expect(await verifyPassword(`${password}extra`, hash)).toBe(false);
    });

    it("rejects an empty password", async () => {
        const hash = await hashPassword("ExamplePassword123!");

        expect(await verifyPassword("", hash)).toBe(false);
    });
});
