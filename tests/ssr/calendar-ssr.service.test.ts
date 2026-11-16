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

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";

describe("calendarPageService", () => {
    it("loads a zone-aware month, the company's events and only public employee picker fields", async () => {
        vi.mocked(employeeService.getAll).mockResolvedValue([
            {
                id: "employee",
                companyId,
                fullName: "Employee",
                imageId: null,
                position: "HR",
                level: null,
                phoneNumber: null,
                slack: null,
                telegram: null,
                viber: null,
                whatsapp: null,
                discord: null,
                userAccount: null,
            },
        ]);
        vi.mocked(eventService.getRange).mockResolvedValue([]);
        const data = await calendarPageService.getPageData(
            {
                month: "2026-10",
                timeZone: "Europe/Kyiv",
            },
            companyId,
        );
        expect(eventService.getRange).toHaveBeenCalledWith(
            {
                from: "2026-09-30T21:00:00.000Z",
                to: "2026-10-31T22:00:00.000Z",
                timeZone: "Europe/Kyiv",
            },
            companyId,
        );
        expect(employeeService.getAll).toHaveBeenCalledWith(companyId);
        expect(data.month).toBe("2026-10");
        expect(data.eventTypes).toEqual(["LEAVE", "SICK_LEAVE", "VACATION", "TIME_OFF", "MEETING"]);
        expect(data.employees).toEqual([
            { id: "employee", fullName: "Employee", imageId: null, position: "HR" },
        ]);
    });
});
