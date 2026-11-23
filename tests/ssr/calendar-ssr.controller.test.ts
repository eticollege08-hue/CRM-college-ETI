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
    it("renders the calendar page with events and the authenticated profile", async () => {
        const actor = {
            userId: "account",
            role: "OWNER" as const,
            companyId: "company",
            exp: 2_000_000_000,
        };
        const calendar = {
            month: "2026-10",
            monthLabel: "October 2026",
            previousMonth: "2026-09",
            nextMonth: "2026-11",
            currentDate: "2026-10-01",
            timeZone: "Europe/Kyiv",
            events: [],
            eventTypes: [],
            employees: [],
            weeks: [],
            range: { from: "2026-09-30T21:00:00.000Z", to: "2026-10-31T22:00:00.000Z" },
        };
        const profileData = {
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
        vi.mocked(calendarPageService.getPageData).mockResolvedValue(calendar);
        vi.mocked(authPageService.getProfilePageData).mockResolvedValue(profileData);
        const req = {
            user: actor,
            query: { month: "2026-10", timeZone: "Europe/Kyiv" },
        } as unknown as Request;
        const res = { setHeader: vi.fn(), render: vi.fn() };
        await calendarPageController.calendar(req, res as unknown as Response);
        expect(calendarPageService.getPageData).toHaveBeenCalledExactlyOnceWith(
            { month: "2026-10", timeZone: "Europe/Kyiv" },
            actor,
        );
        expect(authPageService.getProfilePageData).toHaveBeenCalledExactlyOnceWith("account");
        expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(res.render).toHaveBeenCalledWith("pages/calendar", {
            css: "calendar",
            js: "",
            activePage: "calendar",
            hideBrand: true,
            profile: profileData.profile,
            ...calendar,
        });
    });
});
