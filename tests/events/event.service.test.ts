import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventService } from "../../src/modules/events/event.service.js";

import type { Prisma } from "@prisma/client";
import type { EventRepository } from "../../src/modules/events/event.repository.js";
import type { UserAccountRepository } from "../../src/modules/user-accounts/user-account.repository.js";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const actorId = "550e8400-e29b-41d4-a716-446655440001";
const employeeId = "550e8400-e29b-41d4-a716-446655440002";
const anotherId = "550e8400-e29b-41d4-a716-446655440003";
const eventId = "550e8400-e29b-41d4-a716-446655440004";
const input = {
    type: "MEETING" as const,
    title: "Planning",
    description: "Details",
    startsAt: "2026-10-26T10:00:00Z",
    endsAt: "2026-10-26T11:00:00Z",
    timeZone: "UTC",
    participantIds: [employeeId],
};
const existing = {
    id: eventId,
    ownerAccountId: actorId,
    type: input.type,
    title: input.title,
    description: input.description,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    timeZone: "UTC",
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
        { employee: { id: employeeId, fullName: "Employee", imageId: null, position: null } },
    ],
};

describe("EventService", () => {
    const tx = {} as Prisma.TransactionClient;
    const repository = {
        transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>) =>
            operation(tx),
        ),
        getById: vi.fn(),
        getRange: vi.fn(),
        getEmployees: vi.fn(),
        hasConflict: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };
    const accounts = { getById: vi.fn() };
    const service = new EventService(
        repository as unknown as EventRepository,
        accounts as unknown as UserAccountRepository,
    );

    beforeEach(() => {
        repository.getById.mockResolvedValue(structuredClone(existing));
        repository.getEmployees.mockImplementation(async (ids: string[]) =>
            ids.map((id) => ({ id })),
        );
        repository.hasConflict.mockResolvedValue(false);
        repository.create.mockResolvedValue(existing);
        repository.update.mockResolvedValue(existing);
        accounts.getById.mockResolvedValue({ id: actorId, isActive: true, employeeId: anotherId });
    });

    it("uses the account ID as owner and does not automatically occupy the creator", async () => {
        await service.create(input, actorId);
        expect(repository.create).toHaveBeenCalledWith(
            actorId,
            expect.objectContaining({
                startsAt: new Date(input.startsAt),
                endsAt: new Date(input.endsAt),
            }),
            [employeeId],
            tx,
        );
        expect(repository.hasConflict).toHaveBeenCalledWith(
            [employeeId],
            expect.any(Date),
            expect.any(Date),
            tx,
            undefined,
        );
    });
    it.each([null, { isActive: false }])(
        "rejects an unavailable creator account",
        async (account) => {
            accounts.getById.mockResolvedValue(account);
            await expect(service.create(input, actorId)).rejects.toMatchObject({ status: 401 });
            expect(repository.create).not.toHaveBeenCalled();
        },
    );
    it("rejects a missing participant before writing", async () => {
        repository.getEmployees.mockResolvedValue([]);
        await expect(service.create(input, actorId)).rejects.toMatchObject({ status: 404 });
        expect(repository.create).not.toHaveBeenCalled();
    });
    it("rejects scheduling conflicts", async () => {
        repository.hasConflict.mockResolvedValue(true);
        await expect(service.create(input, actorId)).rejects.toMatchObject({ status: 409 });
        expect(repository.create).not.toHaveBeenCalled();
    });
    it("validates the merged PATCH time range", async () => {
        await expect(
            service.update(eventId, { startsAt: "2026-10-26T12:00:00Z" }, actorId),
        ).rejects.toMatchObject({ status: 422 });
        expect(repository.update).not.toHaveBeenCalled();
    });
    it("excludes the current event during update conflict checks", async () => {
        await service.update(eventId, { title: "Updated" }, actorId);
        expect(repository.hasConflict).toHaveBeenCalledWith(
            [employeeId],
            existing.startsAt,
            existing.endsAt,
            tx,
            eventId,
        );
        expect(repository.update).toHaveBeenCalledWith(
            eventId,
            expect.objectContaining({ title: "Updated" }),
            [employeeId],
            tx,
        );
    });
    it.each(["update", "delete", "add", "remove"])("only the author can %s", async (operation) => {
        const action =
            operation === "update"
                ? service.update(eventId, { title: "Other" }, anotherId)
                : operation === "delete"
                  ? service.delete(eventId, input.title, anotherId)
                  : operation === "add"
                    ? service.addParticipants(eventId, [anotherId], anotherId)
                    : service.removeParticipant(eventId, employeeId, anotherId);
        await expect(action).rejects.toMatchObject({ status: 403 });
        expect(repository.update).not.toHaveBeenCalled();
        expect(repository.delete).not.toHaveBeenCalled();
    });
    it("returns 404 for a missing event", async () => {
        repository.getById.mockResolvedValue(null);
        await expect(service.getById(eventId)).rejects.toMatchObject({ status: 404 });
    });
    it.each(["planning", "Planning ", "Wrong"])(
        "requires the exact current title: %s",
        async (title) => {
            await expect(service.delete(eventId, title, actorId)).rejects.toMatchObject({
                status: 422,
                details: [{ field: "confirmationTitle", message: expect.any(String) }],
            });
            expect(repository.delete).not.toHaveBeenCalled();
        },
    );
    it("deletes a confirmed event inside the transaction", async () => {
        await service.delete(eventId, input.title, actorId);
        expect(repository.delete).toHaveBeenCalledWith(eventId, tx);
    });
    it("adds participants idempotently and checks the resulting schedule", async () => {
        await service.addParticipants(eventId, [employeeId, anotherId], actorId);
        expect(repository.update).toHaveBeenCalledWith(
            eventId,
            expect.any(Object),
            [employeeId, anotherId],
            tx,
        );
    });
    it("rejects adding a busy participant without changing membership", async () => {
        repository.hasConflict.mockResolvedValue(true);
        await expect(service.addParticipants(eventId, [anotherId], actorId)).rejects.toMatchObject({
            status: 409,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });
    it("rejects removing the last participant", async () => {
        await expect(service.removeParticipant(eventId, employeeId, actorId)).rejects.toMatchObject(
            { status: 422 },
        );
    });
    it("returns 404 if the employee is not an event participant", async () => {
        await expect(service.removeParticipant(eventId, anotherId, actorId)).rejects.toMatchObject({
            status: 404,
        });
    });
    it("removes a participant while preserving the others", async () => {
        repository.getById.mockResolvedValue({
            ...existing,
            participants: [...existing.participants, { employee: { id: anotherId } }],
        });
        await service.removeParticipant(eventId, anotherId, actorId);
        expect(repository.update).toHaveBeenCalledWith(
            eventId,
            expect.any(Object),
            [employeeId],
            tx,
        );
    });
    it("translates a local day into the correct UTC query interval", async () => {
        await service.getRange({ date: "2026-10-26", timeZone: "Europe/Kyiv" });
        expect(repository.getRange).toHaveBeenCalledWith(
            new Date("2026-10-25T22:00:00Z"),
            new Date("2026-10-26T22:00:00Z"),
        );
    });
});
