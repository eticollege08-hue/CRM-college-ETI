import { describe, expect, it, vi } from "vitest";

import { UserAccountRepository } from "../../src/modules/user-accounts/user-account.repository.js";

import type { PrismaClient } from "@prisma/client";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const accountId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};

describe("UserAccountRepository.getEmployeeByAccountId", () => {
    it("queries the account by ID and returns only its employee relation", async () => {
        const findUnique = vi.fn().mockResolvedValue({ employee });
        const db = { userAccount: { findUnique } } as unknown as PrismaClient;
        const repository = new UserAccountRepository(db);

        const result = await repository.getEmployeeByAccountId(accountId);

        expect(findUnique).toHaveBeenCalledWith({
            where: { id: accountId },
            select: { employee: true },
        });
        expect(result).toEqual(employee);
    });

    it("returns null when the account does not exist", async () => {
        const findUnique = vi.fn().mockResolvedValue(null);
        const db = { userAccount: { findUnique } } as unknown as PrismaClient;
        const repository = new UserAccountRepository(db);

        const result = await repository.getEmployeeByAccountId(accountId);

        expect(result).toBeNull();
    });
});

describe("UserAccountRepository.createSeedAccount", () => {
    const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
    const data = {
        email: "example@example.com",
        passwordHash: "bcrypt-hash",
        roleKey: "OWNER" as const,
    };

    it("creates the company, employee and account in one transaction within one company", async () => {
        const account = { id: accountId, ...data, employeeId: employee.id, companyId };
        const tx = {
            company: { upsert: vi.fn().mockResolvedValue({ id: companyId }) },
            employee: { create: vi.fn().mockResolvedValue({ id: employee.id }) },
            userAccount: { create: vi.fn().mockResolvedValue(account) },
        };
        const db = {
            userAccount: { findUnique: vi.fn().mockResolvedValue(null) },
            $transaction: vi.fn((operation: (client: typeof tx) => Promise<unknown>) =>
                operation(tx),
            ),
        } as unknown as PrismaClient;
        const repository = new UserAccountRepository(db);

        const result = await repository.createSeedAccount(data, "Mock", "Default company");

        expect(tx.company.upsert).toHaveBeenCalledWith({
            where: { name: "Default company" },
            update: {},
            create: { name: "Default company" },
        });
        expect(tx.employee.create).toHaveBeenCalledWith({
            data: { fullName: "Mock", companyId },
        });
        expect(tx.userAccount.create).toHaveBeenCalledWith({
            data: { ...data, isActive: true, employeeId: employee.id, companyId },
        });
        expect(result).toEqual(account);
    });

    it("returns the existing account without writing anything", async () => {
        const existing = { id: accountId, ...data };
        const $transaction = vi.fn();
        const db = {
            userAccount: { findUnique: vi.fn().mockResolvedValue(existing) },
            $transaction,
        } as unknown as PrismaClient;
        const repository = new UserAccountRepository(db);

        await expect(
            repository.createSeedAccount(data, "Mock", "Default company"),
        ).resolves.toEqual(existing);
        expect($transaction).not.toHaveBeenCalled();
    });
});
