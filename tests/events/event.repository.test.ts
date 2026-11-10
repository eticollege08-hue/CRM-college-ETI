import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { EventRepository } from "../../src/modules/events/event.repository.js";

import type { PrismaClient } from "@prisma/client";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

describe("EventRepository", () => {
    it("returns only events overlapping the day for the requested participant without sorting", async () => {
        const findMany = vi.fn().mockResolvedValue([]);
        const repo = new EventRepository({ event: { findMany } } as unknown as PrismaClient);
        const from = new Date("2026-11-10T00:00:00.000Z");
        const to = new Date("2026-11-11T00:00:00.000Z");

        await repo.getParticipantRange("employee-id", from, to);

        expect(findMany).toHaveBeenCalledWith({
            where: {
                startsAt: { lt: to },
                endsAt: { gt: from },
                participants: { some: { employeeId: "employee-id" } },
            },
            select: { title: true, startsAt: true, endsAt: true },
        });
    });

    it("uses strict overlap boundaries and excludes the edited event", async () => {
        const findFirst = vi.fn().mockResolvedValue(null);
        const tx = { event: { findFirst } } as unknown as Prisma.TransactionClient;
        const repo = new EventRepository({} as PrismaClient);
        const startsAt = new Date("2026-10-26T10:00:00Z");
        const endsAt = new Date("2026-10-26T11:00:00Z");
        expect(await repo.hasConflict(["employee"], startsAt, endsAt, tx, "event")).toBe(false);
        expect(findFirst).toHaveBeenCalledWith({
            where: {
                id: { not: "event" },
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
                participants: { some: { employeeId: { in: ["employee"] } } },
            },
            select: { id: true },
        });
    });
    it("retries Serializable conflicts using a fresh transaction", async () => {
        const operation = vi.fn().mockResolvedValue("result");
        const conflict = new Prisma.PrismaClientKnownRequestError("conflict", {
            code: "P2034",
            clientVersion: "5.22.0",
        });
        const transaction = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValue("result");
        const repo = new EventRepository({ $transaction: transaction } as unknown as PrismaClient);
        expect(await repo.transaction(operation)).toBe("result");
        expect(transaction).toHaveBeenCalledTimes(2);
        expect(transaction).toHaveBeenCalledWith(operation, { isolationLevel: "Serializable" });
    });
    it("returns 409 after bounded retries", async () => {
        const conflict = new Prisma.PrismaClientKnownRequestError("conflict", {
            code: "P2034",
            clientVersion: "5.22.0",
        });
        const transaction = vi.fn().mockRejectedValue(conflict);
        const repo = new EventRepository({ $transaction: transaction } as unknown as PrismaClient);
        await expect(repo.transaction(vi.fn())).rejects.toMatchObject({ status: 409 });
        expect(transaction).toHaveBeenCalledTimes(3);
    });
    it("does not retry infrastructure failures", async () => {
        const error = new Error("Database unavailable");
        const transaction = vi.fn().mockRejectedValue(error);
        const repo = new EventRepository({ $transaction: transaction } as unknown as PrismaClient);
        await expect(repo.transaction(vi.fn())).rejects.toBe(error);
        expect(transaction).toHaveBeenCalledTimes(1);
    });
});
