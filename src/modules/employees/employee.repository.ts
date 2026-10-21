import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { EmployeeCreateInput, EmployeeUpdateInput } from "./employee.types.js";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: EmployeeCreateInput) {
        return await this.db.employee.create({ data });
    }

    async getAll() {
        return await this.db.employee.findMany();
    }

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.employee.findUnique({ where: { id } });
    }

    async update(id: string, data: EmployeeUpdateInput) {
        return await this.db.employee.update({ where: { id }, data });
    }

    async delete(id: string) {
        return await this.db.employee.delete({ where: { id } });
    }
}

export const employeeRepository = new EmployeeRepository();
