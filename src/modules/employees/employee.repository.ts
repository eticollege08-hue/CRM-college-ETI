import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async getAll() {
        return await this.db.employee.findMany();
    }

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.employee.findUnique({ where: { id } });
    }
}

export const employeeRepository = new EmployeeRepository();
