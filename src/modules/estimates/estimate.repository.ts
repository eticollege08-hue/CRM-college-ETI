import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
    EstimateCreateInput,
    EstimateUpdateInput,
    EstimateListQuery,
} from "./estimate.types.js";

export class EstimateRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: EstimateCreateInput & { createdBy: string }) {
        return await this.db.estimate.create({
            data: {
                name: data.name,
                description: data.description,
                time: data.time ?? null,
                payment: data.payment !== undefined && data.payment !== null ? data.payment : null,
                createdBy: data.createdBy,
            },
        });
    }

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.estimate.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
    }

    async getList(query: EstimateListQuery) {
        const where: Prisma.EstimateWhereInput = {
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

    async update(id: string, data: EstimateUpdateInput) {
        const updateData: Prisma.EstimateUpdateInput = {};

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
            where: { id },
            data: updateData,
        });
    }

    async softDelete(id: string) {
        return await this.db.estimate.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}

export const estimateRepository = new EstimateRepository();
