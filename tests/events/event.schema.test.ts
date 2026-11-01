import { describe, expect, it } from "vitest";

import {
    calendarQuerySchema,
    eventCreateSchema,
    eventListSchema,
    eventUpdateSchema,
    eventDeleteSchema,
    eventParticipantsSchema,
} from "../../src/modules/events/event.schema.js";

const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const valid = {
    type: "MEETING",
    title: " Planning ",
    description: " Details ",
    startsAt: "2026-10-26T10:00:00+02:00",
    endsAt: "2026-10-26T11:00:00+02:00",
    timeZone: "Europe/Kyiv",
    participantIds: [employeeId],
};

describe("event input schemas", () => {
    it("normalizes text and accepts offset timestamps", () => {
        expect(eventCreateSchema.parse(valid)).toMatchObject({
            title: "Planning",
            description: "Details",
        });
    });
    it.each(["LEAVE", "SICK_LEAVE", "VACATION", "TIME_OFF", "MEETING"])("supports %s", (type) => {
        expect(eventCreateSchema.safeParse({ ...valid, type }).success).toBe(true);
    });
    it.each([
        { type: "ROOM_BOOKING" },
        { title: " " },
        { title: "a".repeat(201) },
        { description: "a".repeat(4001) },
        { startsAt: "2026-02-30T10:00:00Z" },
        { startsAt: "2026-10-26T10:00:00" },
        { startsAt: "2026-10-26T10:00:00.0001Z" },
        { startsAt: "0000-10-26T10:00:00Z" },
        { timeZone: "Not/AZone" },
        { timeZone: "+02:00" },
        { participantIds: [] },
        { participantIds: [employeeId, employeeId] },
        { participantIds: ["invalid"] },
        { ownerAccountId: employeeId },
        { allDay: true },
    ])("rejects invalid create input %j", (change) => {
        expect(eventCreateSchema.safeParse({ ...valid, ...change }).success).toBe(false);
    });
    it("accepts a partial update, not an empty or unknown patch", () => {
        expect(eventUpdateSchema.parse({ title: " New " })).toEqual({ title: "New" });
        expect(eventUpdateSchema.safeParse({}).success).toBe(false);
        expect(eventUpdateSchema.safeParse({ ownerAccountId: employeeId }).success).toBe(false);
    });
    it("preserves the exact deletion confirmation", () => {
        expect(eventDeleteSchema.parse({ confirmationTitle: " Title " }).confirmationTitle).toBe(
            " Title ",
        );
    });
    it("rejects duplicate add-participant IDs", () => {
        expect(
            eventParticipantsSchema.safeParse({ participantIds: [employeeId, employeeId] }).success,
        ).toBe(false);
    });
});

describe("calendar queries", () => {
    it("accepts a local day and defaults to UTC", () => {
        expect(eventListSchema.parse({ date: "2026-10-26" }).timeZone).toBe("UTC");
    });
    it("accepts an explicit half-open UTC range", () => {
        expect(
            eventListSchema.safeParse({ from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" })
                .success,
        ).toBe(true);
    });
    it.each([
        {},
        { date: "2026-02-30" },
        { date: "0000-01-01" },
        { date: "2011-12-30", timeZone: "Pacific/Apia" },
        { date: "2026-10-26", timeZone: "Bad/Zone" },
        { date: "2026-10-26", from: "2026-10-26T00:00:00Z" },
        { from: "2026-10-26T10:00:00Z" },
        { from: "2026-10-26T10:00:00Z", to: "2026-10-26T10:00:00Z" },
        { from: "2026-10-26T10:00:00Z", to: "2026-10-26T09:00:00Z" },
        { from: "2026-01-01T00:00:00Z", to: "2028-01-01T00:00:00Z" },
    ])("rejects invalid list query without throwing %j", (input) => {
        expect(eventListSchema.safeParse(input).success).toBe(false);
    });
    it("validates SSR month and rejects unknown params", () => {
        expect(calendarQuerySchema.parse({ month: "2026-10" })).toEqual({
            month: "2026-10",
            timeZone: "UTC",
        });
        expect(calendarQuerySchema.safeParse({ month: "2026-13" }).success).toBe(false);
        expect(calendarQuerySchema.safeParse({ month: "0000-01" }).success).toBe(false);
        expect(calendarQuerySchema.safeParse({ month: "2026-10", role: "OWNER" }).success).toBe(
            false,
        );
    });
});
