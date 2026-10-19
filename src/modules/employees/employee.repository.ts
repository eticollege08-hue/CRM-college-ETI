import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async getById(id: string) {
        return await this.db.employee.findUnique({ where: { id } });
    }
}

export const employeeRepository = new EmployeeRepository();
