import { Prisma } from "@prisma/client";

import prisma from "#config/prisma.config.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { EVENT_MESSAGES, EVENT_TRANSACTION_MAX_ATTEMPTS } from "./event.constants.js";

import type { PrismaClient } from "@prisma/client";
import type { EventWrite } from "./event.types.js";

const eventInclude = {
    participants: {
        orderBy: { employeeId: "asc" },
        select: {
            employee: { select: { id: true, fullName: true, imageId: true, position: true } },
        },
    },
} satisfies Prisma.EventInclude;

export class EventRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        for (let attempt = 0; attempt < EVENT_TRANSACTION_MAX_ATTEMPTS; attempt++) {
            try {
                return await this.db.$transaction(operation, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                });
            } catch (error: unknown) {
                if (
                    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
                    error.code !== "P2034"
                )
                    throw error;
            }
        }
        throw new ApiError(HttpStatus.CONFLICT, EVENT_MESSAGES.TRANSACTION_CONFLICT);
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.event.findUnique({ where: { id, companyId }, include: eventInclude });
    }

    async getRange(from: Date, to: Date, companyId: string) {
        return await this.db.event.findMany({
            where: { companyId, startsAt: { lt: to }, endsAt: { gt: from } },
            orderBy: [{ startsAt: "asc" }, { id: "asc" }],
            include: eventInclude,
        });
    }

    async getEmployees(ids: string[], companyId: string, tx: Prisma.TransactionClient) {
        return await tx.employee.findMany({
            where: { id: { in: ids }, companyId },
            select: { id: true },
        });
    }

    async hasConflict(
        ids: string[],
        startsAt: Date,
        endsAt: Date,
        companyId: string,
        tx: Prisma.TransactionClient,
        excludeId?: string,
    ) {
        const conflict = await tx.event.findFirst({
            where: {
                ...(excludeId ? { id: { not: excludeId } } : {}),
                companyId,
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
                participants: { some: { employeeId: { in: ids } } },
            },
            select: { id: true },
        });
        return conflict !== null;
    }

    async create(
        ownerAccountId: string,
        companyId: string,
        data: EventWrite,
        ids: string[],
        tx: Prisma.TransactionClient,
    ) {
        return await tx.event.create({
            data: {
                ...data,
                ownerAccountId,
                companyId,
                participants: { create: ids.map((employeeId) => ({ employeeId })) },
            },
            include: eventInclude,
        });
    }

    async update(
        id: string,
        companyId: string,
        data: EventWrite,
        ids: string[],
        tx: Prisma.TransactionClient,
    ) {
        return await tx.event.update({
            where: { id, companyId },
            data: {
                ...data,
                participants: { deleteMany: {}, create: ids.map((employeeId) => ({ employeeId })) },
            },
            include: eventInclude,
        });
    }

    async delete(id: string, companyId: string, tx: Prisma.TransactionClient) {
        await tx.event.delete({ where: { id, companyId } });
    }
}

export const eventRepository = new EventRepository();
