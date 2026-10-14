import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getInitialAdminConfig, seedInitialAdmin } from "../../src/scripts/auth-seed.script.js";

import type { InitialAdminStore } from "../../src/scripts/auth-seed.script.js";

const config = {
    name: "  Admin  ",
    email: "  ADMIN@EXAMPLE.COM  ",
    password: "ExamplePassword123!",
};

beforeEach(() => {
    vi.stubEnv("BCRYPT_COST", "4");
    vi.stubEnv("ADMIN_NAME", undefined);
    vi.stubEnv("ADMIN_EMAIL", undefined);
    vi.stubEnv("ADMIN_PASSWORD", undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("initial admin seed preparation", () => {
    it("loads and normalizes configured credentials without changing the password", () => {
        vi.stubEnv("ADMIN_EMAIL", config.email);
        vi.stubEnv("ADMIN_PASSWORD", config.password);
        expect(getInitialAdminConfig()).toEqual({
            name: "System Administrator",
            email: "admin@example.com",
            password: config.password,
        });
    });

    it("fails without configured credentials and does not include secret values in the error", () => {
        vi.stubEnv("ADMIN_PASSWORD", "sensitive-short-value");
        expect(() => getInitialAdminConfig()).toThrow("Configure ADMIN_EMAIL");
        try {
            getInitialAdminConfig();
        } catch (error) {
            expect(String(error)).not.toContain("sensitive-short-value");
        }
    });

    it.each(["short", "я".repeat(37)])(
        "rejects invalid seed passwords before accessing storage",
        async (password) => {
            const store: InitialAdminStore = { findByEmail: vi.fn(), createIfAbsent: vi.fn() };
            await expect(seedInitialAdmin(store, { ...config, password })).rejects.toThrow(
                "Invalid initial admin configuration.",
            );
            expect(store.findByEmail).not.toHaveBeenCalled();
        },
    );

    it("passes only a bcrypt hash and normalized data to atomic creation", async () => {
        const create = vi
            .fn<InitialAdminStore["createIfAbsent"]>()
            .mockResolvedValue({ accountId: "admin-id", created: true });
        const store: InitialAdminStore = {
            findByEmail: vi.fn().mockResolvedValue(null),
            createIfAbsent: create,
        };
        await expect(seedInitialAdmin(store, config)).resolves.toEqual({
            accountId: "admin-id",
            created: true,
        });
        const data = create.mock.calls[0]?.[0];
        if (!data) throw new Error("Expected creation input.");
        expect(data).toMatchObject({ name: "Admin", email: "admin@example.com", role: "OWNER" });
        expect(data).not.toHaveProperty("password");
        expect(data.passwordHash).not.toBe(config.password);
        expect(await bcrypt.compare(config.password, data.passwordHash)).toBe(true);
    });

    it("is idempotent without overwriting the existing password", async () => {
        const records = new Map<string, string>();
        const create = vi.fn<InitialAdminStore["createIfAbsent"]>(async (data) => {
            if (records.has(data.email)) return { accountId: "admin-id", created: false };
            records.set(data.email, data.passwordHash);
            return { accountId: "admin-id", created: true };
        });
        const store: InitialAdminStore = {
            findByEmail: async (email) => (records.has(email) ? { id: "admin-id" } : null),
            createIfAbsent: create,
        };
        const hash = vi.fn(async () => "original-hash");
        expect(await seedInitialAdmin(store, config, hash)).toEqual({
            accountId: "admin-id",
            created: true,
        });
        expect(
            await seedInitialAdmin(store, { ...config, password: "DifferentPassword123!" }, hash),
        ).toEqual({ accountId: "admin-id", created: false });
        expect(hash).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledTimes(1);
        expect(records.get("admin@example.com")).toBe("original-hash");
    });

    it("uses the adapter's atomic create-if-absent operation for concurrent seeds", async () => {
        let exists = false;
        const store: InitialAdminStore = {
            findByEmail: async () => null,
            createIfAbsent: async () => {
                const created = !exists;
                exists = true;
                return { accountId: "admin-id", created };
            },
        };
        const results = await Promise.all([
            seedInitialAdmin(store, config, async () => "hash-one"),
            seedInitialAdmin(store, config, async () => "hash-two"),
        ]);
        expect(results.filter((result) => result.created)).toHaveLength(1);
        expect(results.every((result) => result.accountId === "admin-id")).toBe(true);
    });
});
