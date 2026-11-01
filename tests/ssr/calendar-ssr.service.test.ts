import { describe, expect, it, vi } from "vitest";

import { calendarPageService } from "../../src/modules/calendar-ssr/calendar-ssr.service.js";
import { employeeService } from "../../src/modules/employees/employee.service.js";
import { eventService } from "../../src/modules/events/event.service.js";

vi.mock("../../src/modules/employees/employee.service.js", () => ({
    employeeService: { getAll: vi.fn() },
}));
vi.mock("../../src/modules/events/event.service.js", () => ({
    eventService: { getRange: vi.fn() },
}));

describe("calendarPageService", () => {
    it("loads a zone-aware month, events and only public employee picker fields", async () => {
        vi.mocked(employeeService.getAll).mockResolvedValue([
            { id: "employee", fullName: "Employee", imageId: null, position: "HR", level: null },
        ]);
        vi.mocked(eventService.getRange).mockResolvedValue([]);
        const data = await calendarPageService.getPageData({
            month: "2026-10",
            timeZone: "Europe/Kyiv",
        });
        expect(eventService.getRange).toHaveBeenCalledWith({
            from: "2026-09-30T21:00:00.000Z",
            to: "2026-10-31T22:00:00.000Z",
            timeZone: "Europe/Kyiv",
        });
        expect(data.month).toBe("2026-10");
        expect(data.eventTypes).toEqual(["LEAVE", "SICK_LEAVE", "VACATION", "TIME_OFF", "MEETING"]);
        expect(data.employees).toEqual([
            { id: "employee", fullName: "Employee", imageId: null, position: "HR" },
        ]);
    });
});
