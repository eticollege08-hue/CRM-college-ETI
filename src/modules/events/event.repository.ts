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

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.event.findUnique({ where: { id }, include: eventInclude });
    }

    async getRange(from: Date, to: Date) {
        return await this.db.event.findMany({
            where: { startsAt: { lt: to }, endsAt: { gt: from } },
            orderBy: [{ startsAt: "asc" }, { id: "asc" }],
            include: eventInclude,
        });
    }

    async getEmployees(ids: string[], tx: Prisma.TransactionClient) {
        return await tx.employee.findMany({ where: { id: { in: ids } }, select: { id: true } });
    }

    async hasConflict(
        ids: string[],
        startsAt: Date,
        endsAt: Date,
        tx: Prisma.TransactionClient,
        excludeId?: string,
    ) {
        const conflict = await tx.event.findFirst({
            where: {
                ...(excludeId ? { id: { not: excludeId } } : {}),
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
        data: EventWrite,
        ids: string[],
        tx: Prisma.TransactionClient,
    ) {
        return await tx.event.create({
            data: {
                ...data,
                ownerAccountId,
                participants: { create: ids.map((employeeId) => ({ employeeId })) },
            },
            include: eventInclude,
        });
    }

    async update(id: string, data: EventWrite, ids: string[], tx: Prisma.TransactionClient) {
        return await tx.event.update({
            where: { id },
            data: {
                ...data,
                participants: { deleteMany: {}, create: ids.map((employeeId) => ({ employeeId })) },
            },
            include: eventInclude,
        });
    }

    async delete(id: string, tx: Prisma.TransactionClient) {
        await tx.event.delete({ where: { id } });
    }
}

export const eventRepository = new EventRepository();
