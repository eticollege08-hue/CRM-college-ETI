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
}

export const userAccountRepository = new UserAccountRepository();
