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
