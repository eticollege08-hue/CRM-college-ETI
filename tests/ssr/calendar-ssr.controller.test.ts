import { describe, expect, it, vi } from "vitest";

import { calendarPageController } from "../../src/modules/calendar-ssr/calendar-ssr.controller.js";
import { calendarPageService } from "../../src/modules/calendar-ssr/calendar-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/calendar-ssr/calendar-ssr.service.js", () => ({
    calendarPageService: { getPageData: vi.fn() },
}));

describe("calendarPageController", () => {
    it("renders pages/calendar with server-side data and resource metadata", async () => {
        const payload = {
            currentDate: "2026-10-26",
            month: "2026-10",
            timeZone: "UTC",
            range: { from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" },
            events: [],
            eventTypes: [],
            employees: [],
        };
        vi.mocked(calendarPageService.getPageData).mockResolvedValue(payload);
        const req = { query: { month: "2026-10" } } as unknown as Request;
        const res = { setHeader: vi.fn(), render: vi.fn() };
        await calendarPageController.calendar(req, res as unknown as Response);
        expect(calendarPageService.getPageData).toHaveBeenCalledWith({
            month: "2026-10",
            timeZone: "UTC",
        });
        expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(res.render).toHaveBeenCalledWith("pages/calendar", {
            css: "calendar",
            js: "calendar",
            activePage: "calendar",
            ...payload,
        });
    });
});
