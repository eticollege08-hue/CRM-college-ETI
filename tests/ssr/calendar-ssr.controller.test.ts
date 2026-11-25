import { describe, expect, it, vi } from "vitest";

import { calendarPageController } from "../../src/modules/calendar-ssr/calendar-ssr.controller.js";
import { authPageService } from "../../src/modules/auth-ssr/auth-ssr.service.js";
import { calendarPageService } from "../../src/modules/calendar-ssr/calendar-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/auth-ssr/auth-ssr.service.js", () => ({
    authPageService: { getProfilePageData: vi.fn() },
}));
vi.mock("../../src/modules/calendar-ssr/calendar-ssr.service.js", () => ({
    calendarPageService: { getPageData: vi.fn() },
}));

describe("calendarPageController", () => {
    it("renders the calendar placeholder with the authenticated profile", async () => {
        const payload = {
            css: "profile",
            js: "profile",
            activePage: "profile",
            hideBrand: true,
            profile: {
                email: "employee@example.com",
                roleKey: "WORKER" as const,
                initials: "E",
                employee: {
                    id: "employee",
                    imageId: null,
                    fullName: "Employee",
                    position: null,
                    level: null,
                    phoneNumber: null,
                    slack: null,
                    telegram: null,
                    viber: null,
                    whatsapp: null,
                    discord: null,
                },
            },
        };
        const calendarData = {
            currentDate: "2026-10-12",
            month: "2026-10",
            timeZone: "Europe/Kiev",
            range: { from: "from", to: "to" },
            events: [],
            eventTypes: [],
            employees: [],
        };
        vi.mocked(authPageService.getProfilePageData).mockResolvedValue(payload);
        vi.mocked(calendarPageService.getPageData).mockResolvedValue(calendarData);
        const expectedPayload = {
            ...payload,
            ...calendarData,
            css: "calendar",
            js: "calendar",
            activePage: "calendar",
            hideBrand: true,
        };
        const req = { user: { userId: "account" }, query: {} } as unknown as Request;
        const res = { setHeader: vi.fn(), render: vi.fn() };
        await calendarPageController.calendar(req, res as unknown as Response);
        expect(authPageService.getProfilePageData).toHaveBeenCalledExactlyOnceWith("account");
        expect(calendarPageService.getPageData).toHaveBeenCalledExactlyOnceWith({
            timeZone: "Europe/Kiev",
        });
        expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(res.render).toHaveBeenCalledWith("pages/calendar", expectedPayload);
    });

    it("redirects to login when the authenticated account is missing", async () => {
        const req = {} as Request;
        const res = { redirect: vi.fn(), render: vi.fn(), setHeader: vi.fn() };

        await calendarPageController.calendar(req, res as unknown as Response);

        expect(res.redirect).toHaveBeenCalledWith("/login");
        expect(authPageService.getProfilePageData).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
