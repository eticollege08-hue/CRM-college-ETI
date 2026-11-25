import { Role } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    MOCK_SEED_ACCOUNTS,
    MOCK_SEED_COMPANY_NAME,
    MOCK_SEED_SECOND_COMPANY_NAME,
} from "../../src/config/seed.config.js";
import { hierarchyService } from "../../src/modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "../../src/modules/user-accounts/user-account.service.js";
import { seedMockAccounts } from "../../src/scripts/auth-seed.script.js";
import { hashPassword } from "../../src/utils/password.util.js";

vi.mock("#config/prisma.config.js", () => ({ default: { $disconnect: vi.fn() } }));
vi.mock("#modules/hierarchy/hierarchy.service.js", () => ({
    hierarchyService: { getAll: vi.fn(), create: vi.fn() },
}));
vi.mock("#modules/user-accounts/user-account.service.js", () => ({
    userAccountService: { getByEmail: vi.fn(), createSeedAccount: vi.fn() },
}));
vi.mock("#utils/password.util.js", () => ({ hashPassword: vi.fn() }));

type SeedAccountRow = NonNullable<Awaited<ReturnType<typeof userAccountService.getByEmail>>>;
type SeedRelationship = {
    id: string;
    employeeId: string;
    subordinateId: string;
    companyId: string;
};

const accounts = new Map<string, SeedAccountRow>();
const relationships: SeedRelationship[] = [];

function makeAccount(
    email: string,
    passwordHash: string,
    roleKey: SeedAccountRow["roleKey"],
    companyName: string,
): SeedAccountRow {
    return {
        id: `account-${email}`,
        employeeId: `employee-${email}`,
        companyId: `company-${companyName}`,
        email,
        passwordHash,
        roleKey,
        isActive: true,
        lastLoginAt: null,
        company: { deletedAt: null },
    };
}

describe("seedMockAccounts", () => {
    beforeEach(() => {
        vi.stubEnv("NODE_ENV", "development");
        accounts.clear();
        relationships.length = 0;
        vi.mocked(userAccountService.getByEmail).mockImplementation(async (email) => {
            return accounts.get(email) ?? null;
        });
        vi.mocked(userAccountService.createSeedAccount).mockImplementation(
            async (data, _name, companyName) => {
                const account = makeAccount(data.email, data.passwordHash, data.roleKey, companyName);
                accounts.set(data.email, account);
                return account;
            },
        );
        vi.mocked(hierarchyService.getAll).mockImplementation(async (companyId) => {
            return relationships.filter((relationship) => relationship.companyId === companyId);
        });
        vi.mocked(hierarchyService.create).mockImplementation(async (data, companyId) => {
            const relationship = {
                id: `hierarchy-${relationships.length + 1}`,
                companyId,
                ...data,
            };
            relationships.push(relationship);
            return relationship;
        });
        vi.mocked(hashPassword).mockResolvedValue("bcrypt-hash");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("creates each configured account and its hierarchy links", async () => {
        await seedMockAccounts();

        expect(userAccountService.createSeedAccount).toHaveBeenCalledTimes(
            MOCK_SEED_ACCOUNTS.length,
        );
        expect(hierarchyService.create).toHaveBeenCalledTimes(38);
        for (const account of MOCK_SEED_ACCOUNTS) {
            expect(userAccountService.createSeedAccount).toHaveBeenCalledWith(
                { email: account.email, passwordHash: "bcrypt-hash", roleKey: account.roleKey },
                account.name,
                account.companyName,
            );
        }
    });

    it("seeds twenty employees and four accounts per role in each company", () => {
        const companies = new Set(MOCK_SEED_ACCOUNTS.map((account) => account.companyName));
        const emails = new Set(MOCK_SEED_ACCOUNTS.map((account) => account.email));

        expect(companies).toEqual(new Set([MOCK_SEED_COMPANY_NAME, MOCK_SEED_SECOND_COMPANY_NAME]));
        expect(emails.size).toBe(40);
        for (const company of companies) {
            const companyAccounts = MOCK_SEED_ACCOUNTS.filter(
                (account) => account.companyName === company,
            );
            expect(companyAccounts).toHaveLength(20);
            const roleCounts = new Map<string, number>();
            for (const account of companyAccounts) {
                roleCounts.set(account.roleKey, (roleCounts.get(account.roleKey) ?? 0) + 1);
            }
            expect(Object.values(Role).every((role) => roleCounts.get(role) === 4)).toBe(true);
        }
        expect(MOCK_SEED_ACCOUNTS.filter((account) => account.managerEmail)).toHaveLength(38);
        expect(
            MOCK_SEED_ACCOUNTS.filter(
                (account) =>
                    account.managerEmail &&
                    MOCK_SEED_ACCOUNTS.find((manager) => manager.email === account.managerEmail)
                        ?.companyName !== account.companyName,
            ),
        ).toHaveLength(0);
    });

    it("does not change existing credentials or add duplicate hierarchy links on reruns", async () => {
        await seedMockAccounts();
        const firstAccount = accounts.get("example6@example.com");

        await seedMockAccounts();

        expect(userAccountService.createSeedAccount).toHaveBeenCalledTimes(
            MOCK_SEED_ACCOUNTS.length,
        );
        expect(hierarchyService.create).toHaveBeenCalledTimes(38);
        expect(accounts.get("example6@example.com")).toBe(firstAccount);
        expect(hashPassword).toHaveBeenCalledTimes(MOCK_SEED_ACCOUNTS.length);
        expect(relationships.filter((relationship) => relationship.companyId === "company-Default company"))
            .toHaveLength(19);
        expect(
            relationships.filter((relationship) => relationship.companyId === "company-Second company"),
        ).toHaveLength(19);
    });

    it("skips accounts that already exist without changing their credentials", async () => {
        const existingConfig = MOCK_SEED_ACCOUNTS.find(
            (account) => account.email === "example6@example.com",
        );
        if (!existingConfig) throw new Error("Expected the second company owner seed account.");
        const existing = makeAccount(
            existingConfig.email,
            "existing-password-hash",
            existingConfig.roleKey,
            existingConfig.companyName,
        );
        accounts.set(existingConfig.email, existing);

        await seedMockAccounts();

        expect(userAccountService.createSeedAccount).toHaveBeenCalledTimes(
            MOCK_SEED_ACCOUNTS.length - 1,
        );
        expect(accounts.get(existingConfig.email)?.passwordHash).toBe("existing-password-hash");
    });

    it("refuses to run outside development", async () => {
        vi.stubEnv("NODE_ENV", "production");

        await expect(seedMockAccounts()).rejects.toThrow(
            "Mock account seed is allowed only in development.",
        );
        expect(userAccountService.createSeedAccount).not.toHaveBeenCalled();
    });
});
