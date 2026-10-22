import { Prisma } from "@prisma/client";

import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { UserAccountCreateInput } from "./user-account.types.js";

export class UserAccountRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: UserAccountCreateInput) {
        return await this.db.userAccount.create({ data });
    }

    async getByEmail(email: string) {
        return await this.db.userAccount.findUnique({ where: { email } });
    }

    async getEmployeeByAccountId(accountId: string) {
        const userAccount = await this.db.userAccount.findUnique({
            where: { id: accountId },
            select: { employee: true },
        });

        if (!userAccount) {
            return null;
        }

        return userAccount.employee;
    }

    async updateLastLoginAt(id: string, date: Date) {
        return await this.db.userAccount.update({ where: { id }, data: { lastLoginAt: date } });
    }

    async createSeedAccount(
        data: Pick<UserAccountCreateInput, "email" | "passwordHash" | "roleKey">,
        fullName: string,
    ) {
        const existing = await this.getByEmail(data.email);
        if (existing) return existing;

        try {
            return await this.db.userAccount.create({
                data: {
                    ...data,
                    isActive: true,
                    employee: { create: { fullName } },
                },
            });
        } catch (error: unknown) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const account = await this.getByEmail(data.email);
                if (account) return account;
            }
            throw error;
        }
    }
}

export const userAccountRepository = new UserAccountRepository();
