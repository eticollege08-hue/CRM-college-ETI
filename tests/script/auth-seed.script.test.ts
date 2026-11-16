import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_SEED_ACCOUNTS } from "../../src/config/seed.config.js";
import { userAccountService } from "../../src/modules/user-accounts/user-account.service.js";
import { seedMockAccounts } from "../../src/scripts/auth-seed.script.js";
import { hashPassword } from "../../src/utils/password.util.js";

vi.mock("#config/prisma.config.js", () => ({ default: { $disconnect: vi.fn() } }));
vi.mock("#modules/user-accounts/user-account.service.js", () => ({
    userAccountService: { getByEmail: vi.fn(), createSeedAccount: vi.fn() },
}));
vi.mock("#utils/password.util.js", () => ({ hashPassword: vi.fn() }));

describe("seedMockAccounts", () => {
    beforeEach(() => {
        vi.stubEnv("NODE_ENV", "development");
        vi.mocked(userAccountService.getByEmail).mockResolvedValue(null);
        vi.mocked(hashPassword).mockResolvedValue("bcrypt-hash");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("creates every mock account in its own configured company", async () => {
        await seedMockAccounts();

        expect(userAccountService.createSeedAccount).toHaveBeenCalledTimes(
            MOCK_SEED_ACCOUNTS.length,
        );
        for (const account of MOCK_SEED_ACCOUNTS) {
            expect(userAccountService.createSeedAccount).toHaveBeenCalledWith(
                { email: account.email, passwordHash: "bcrypt-hash", roleKey: account.roleKey },
                account.name,
                account.companyName,
            );
        }
    });

    it("seeds two companies, each with one account per role and globally unique emails", () => {
        const companies = new Set(MOCK_SEED_ACCOUNTS.map((account) => account.companyName));
        const emails = new Set(MOCK_SEED_ACCOUNTS.map((account) => account.email));

        expect(companies.size).toBe(2);
        expect(emails.size).toBe(MOCK_SEED_ACCOUNTS.length);
        for (const company of companies) {
            const roles = MOCK_SEED_ACCOUNTS.filter((account) => account.companyName === company)
                .map((account) => account.roleKey)
                .sort();
            expect(roles).toEqual(["HR", "MANAGER", "OWNER", "RECRUITER", "WORKER"]);
        }
    });

    it("skips accounts that already exist without changing their credentials", async () => {
        vi.mocked(userAccountService.getByEmail).mockImplementation(async (email) =>
            email === "example6@example.com"
                ? ({ id: "existing" } as Awaited<ReturnType<typeof userAccountService.getByEmail>>)
                : null,
        );

        await seedMockAccounts();

        expect(userAccountService.createSeedAccount).toHaveBeenCalledTimes(
            MOCK_SEED_ACCOUNTS.length - 1,
        );
        expect(userAccountService.createSeedAccount).not.toHaveBeenCalledWith(
            expect.objectContaining({ email: "example6@example.com" }),
            expect.anything(),
            expect.anything(),
        );
    });

    it("refuses to run outside development", async () => {
        vi.stubEnv("NODE_ENV", "production");

        await expect(seedMockAccounts()).rejects.toThrow(
            "Mock account seed is allowed only in development.",
        );
        expect(userAccountService.createSeedAccount).not.toHaveBeenCalled();
    });
});
