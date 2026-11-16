import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { EmployeeUpdateInput } from "./employee.types.js";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async getAll(companyId: string) {
        return await this.db.employee.findMany({
            where: { companyId },
            include: { userAccount: { select: { email: true, roleKey: true } } },
            orderBy: { fullName: "asc" },
        });
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.employee.findUnique({ where: { id, companyId } });
    }

    async update(id: string, companyId: string, data: EmployeeUpdateInput) {
        return await this.db.employee.update({ where: { id, companyId }, data });
    }
}

export const employeeRepository = new EmployeeRepository();
