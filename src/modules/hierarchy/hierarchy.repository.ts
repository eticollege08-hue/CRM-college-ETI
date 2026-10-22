import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { HierarchyCreateInput, HierarchyUpdateInput } from "./hierarchy.types.js";

export class HierarchyRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: HierarchyCreateInput, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.create({ data });
    }

    async getAll(tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.findMany();
    }

    async getAllRelationships(tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.findMany({
            select: { id: true, employeeId: true, subordinateId: true },
        });
    }

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.findUnique({ where: { id } });
    }

    async getByPair(
        employeeId: string,
        subordinateId: string,
        tx: Prisma.TransactionClient = this.db,
    ) {
        return await tx.hierarchy.findUnique({
            where: { employeeId_subordinateId: { employeeId, subordinateId } },
        });
    }

    async update(id: string, data: HierarchyUpdateInput, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.update({ where: { id }, data });
    }

    async delete(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.delete({ where: { id } });
    }
}

export const hierarchyRepository = new HierarchyRepository();
