import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { EmployeeUpdateInput } from "./employee.types.js";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async getAll(companyId: string) {
        return await this.db.employee.findMany({
            where: { companyId },
            include: {
                userAccount: { select: { email: true, roleKey: true } },
                compensation: { select: { salary: true, currency: true } },
            },
            orderBy: { fullName: "asc" },
        });
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.employee.findUnique({ where: { id, companyId } });
    }

    async getWithCompensation(id: string, companyId: string) {
        return await this.db.employee.findUnique({
            where: { id, companyId },
            include: { compensation: { select: { salary: true, currency: true } } },
        });
    }

    async update(id: string, companyId: string, data: EmployeeUpdateInput) {
        return await this.db.employee.update({ where: { id, companyId }, data });
    }

    async upsertCompensation(
        employeeId: string,
        companyId: string,
        salary: number,
        currency?: string,
    ) {
        return await this.db.employeeCompensation.upsert({
            where: { employeeId_companyId: { employeeId, companyId } },
            create: { employeeId, companyId, salary, currency: currency ?? "USD" },
            update: { salary, ...(currency === undefined ? {} : { currency }) },
        });
    }
}

export const employeeRepository = new EmployeeRepository();
