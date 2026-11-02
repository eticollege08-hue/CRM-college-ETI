import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { EmployeeUpdateInput } from "./employee.types.js";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async getAll() {
        return await this.db.employee.findMany({
            include: { userAccount: { select: { email: true, roleKey: true } } },
            orderBy: { fullName: "asc" },
        });
    }

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.employee.findUnique({ where: { id } });
    }

    async update(id: string, data: EmployeeUpdateInput) {
        return await this.db.employee.update({ where: { id }, data });
    }
}

export const employeeRepository = new EmployeeRepository();
