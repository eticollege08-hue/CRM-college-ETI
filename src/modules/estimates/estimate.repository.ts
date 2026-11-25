import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
    EstimateCreateInput,
    EstimateUpdateInput,
    EstimateListQuery,
} from "./estimate.types.js";

export class EstimateRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: EstimateCreateInput & { createdBy: string; companyId: string }) {
        return await this.db.estimate.create({
            data: {
                name: data.name,
                description: data.description,
                time: data.time ?? null,
                payment: data.payment !== undefined && data.payment !== null ? data.payment : null,
                createdBy: data.createdBy,
                companyId: data.companyId,
            },
        });
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.estimate.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null,
            },
        });
    }

    async getList(query: EstimateListQuery, companyId: string) {
        const where: Prisma.EstimateWhereInput = {
            companyId,
            deletedAt: null,
            ...(query.search
                ? {
                      name: {
                          contains: query.search,
                          mode: "insensitive",
                      },
                  }
                : {}),
        };

        const skip = (query.page - 1) * query.pageSize;
        const take = query.pageSize;

        const [estimates, totalCount] = await Promise.all([
            this.db.estimate.findMany({
                where,
                skip,
                take,
                orderBy: {
                    [query.sortBy]: query.sortOrder,
                },
            }),
            this.db.estimate.count({ where }),
        ]);

        return {
            estimates,
            meta: {
                totalCount,
                page: query.page,
                pageSize: query.pageSize,
            },
        };
    }

    async update(id: string, companyId: string, data: EstimateUpdateInput) {
        const updateData: Prisma.EstimateUncheckedUpdateInput = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }
        if (data.description !== undefined) {
            updateData.description = data.description;
        }
        if (data.time !== undefined) {
            updateData.time = data.time;
        }
        if (data.payment !== undefined) {
            updateData.payment = data.payment;
        }

        return await this.db.estimate.update({
            where: { id, companyId },
            data: updateData,
        });
    }

    async softDelete(id: string, companyId: string) {
        return await this.db.estimate.update({
            where: { id, companyId },
            data: { deletedAt: new Date() },
        });
    }
}

export const estimateRepository = new EstimateRepository();
