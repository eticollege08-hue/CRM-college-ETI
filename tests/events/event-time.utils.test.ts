import { describe, expect, it } from "vitest";

import {
    dayBounds,
    monthBounds,
    localDate,
    validEventRange,
} from "../../src/modules/events/event-time.util.js";

describe("calendar time zones", () => {
    it("uses the Kyiv local day rather than the UTC date", () => {
        const bounds = dayBounds("2026-10-26", "Europe/Kyiv");
        expect(bounds.from.toISOString()).toBe("2026-10-25T22:00:00.000Z");
        expect(bounds.to.toISOString()).toBe("2026-10-26T22:00:00.000Z");
        expect(localDate(new Date("2026-10-25T23:00:00Z"), "Europe/Kyiv")).toBe("2026-10-26");
    });
    it.each([
        ["2026-03-29", 23],
        ["2026-10-25", 25],
    ])("handles the DST day %s", (date, hours) => {
        const bounds = dayBounds(String(date), "Europe/Kyiv");
        expect((bounds.to.getTime() - bounds.from.getTime()) / 3_600_000).toBe(hours);
    });
    it("calculates month boundaries with different offsets", () => {
        const bounds = monthBounds("2026-10", "Europe/Kyiv");
        expect(bounds.from.toISOString()).toBe("2026-09-30T21:00:00.000Z");
        expect(bounds.to.toISOString()).toBe("2026-10-31T22:00:00.000Z");
    });
    it("rejects inverted, full-day and multi-day events but allows an exclusive midnight end", () => {
        const day = dayBounds("2026-10-26", "UTC");
        expect(validEventRange(day.from, day.from, "UTC")).toBe(false);
        expect(validEventRange(day.to, day.from, "UTC")).toBe(false);
        expect(validEventRange(day.from, day.to, "UTC")).toBe(false);
        expect(validEventRange(new Date("2026-10-26T23:00:00Z"), day.to, "UTC")).toBe(true);
        expect(validEventRange(day.from, new Date("2026-10-27T01:00:00Z"), "UTC")).toBe(false);
    });
});
