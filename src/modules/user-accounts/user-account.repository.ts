import { Prisma } from "@prisma/client";

import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type {
    UserAccountCreateInput,
    UserAccountProfileUpdateInput,
} from "./user-account.types.js";

export class UserAccountRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: UserAccountCreateInput, companyId: string) {
        return await this.db.userAccount.create({ data: { ...data, companyId } });
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

    async getById(id: string) {
        return await this.db.userAccount.findUnique({ where: { id } });
    }
    async getProfileById(id: string) {
        return await this.db.userAccount.findUnique({
            where: { id },
            select: {
                email: true,
                roleKey: true,
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        position: true,
                        level: true,
                        phoneNumber: true,
                        slack: true,
                        telegram: true,
                        viber: true,
                        whatsapp: true,
                        discord: true,
                    },
                },
            },
        });
    }
    async updateProfile(id: string, data: UserAccountProfileUpdateInput) {
        const { email, ...employeeData } = data;
        return await this.db.userAccount.update({
            where: { id },
            data: { email, employee: { update: employeeData } },
            select: {
                email: true,
                roleKey: true,
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        position: true,
                        level: true,
                        phoneNumber: true,
                        slack: true,
                        telegram: true,
                        viber: true,
                        whatsapp: true,
                        discord: true,
                    },
                },
            },
        });
    }
    async updateLastLoginAt(id: string, date: Date) {
        return await this.db.userAccount.update({ where: { id }, data: { lastLoginAt: date } });
    }

    async createSeedAccount(
        data: Pick<UserAccountCreateInput, "email" | "passwordHash" | "roleKey">,
        fullName: string,
        companyName: string,
    ) {
        const existing = await this.getByEmail(data.email);
        if (existing) return existing;

        try {
            // Company, Employee and UserAccount are written together so a failed account
            // insert never leaves an orphaned employee behind.
            return await this.db.$transaction(async (tx) => {
                const company = await tx.company.upsert({
                    where: { name: companyName },
                    update: {},
                    create: { name: companyName },
                });
                const employee = await tx.employee.create({
                    data: { fullName, companyId: company.id },
                });
                return await tx.userAccount.create({
                    data: {
                        ...data,
                        isActive: true,
                        employeeId: employee.id,
                        companyId: company.id,
                    },
                });
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
