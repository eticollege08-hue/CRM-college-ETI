import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { HierarchyCreateInput, HierarchyUpdateInput } from "./hierarchy.types.js";

export class HierarchyRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(
        data: HierarchyCreateInput,
        companyId: string,
        tx: Prisma.TransactionClient = this.db,
    ) {
        return await tx.hierarchy.create({ data: { ...data, companyId } });
    }

    async getAll(companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.findMany({ where: { companyId } });
    }

    async getAllRelationships(companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.findMany({
            where: { companyId },
            select: { id: true, employeeId: true, subordinateId: true },
        });
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.findUnique({ where: { id, companyId } });
    }

    async getByPair(
        employeeId: string,
        subordinateId: string,
        companyId: string,
        tx: Prisma.TransactionClient = this.db,
    ) {
        return await tx.hierarchy.findUnique({
            where: { employeeId_subordinateId: { employeeId, subordinateId }, companyId },
        });
    }

    async update(
        id: string,
        companyId: string,
        data: HierarchyUpdateInput,
        tx: Prisma.TransactionClient = this.db,
    ) {
        return await tx.hierarchy.update({ where: { id, companyId }, data });
    }

    async delete(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.hierarchy.delete({ where: { id, companyId } });
    }
}

export const hierarchyRepository = new HierarchyRepository();
