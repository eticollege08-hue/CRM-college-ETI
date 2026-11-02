import { describe, expect, it, vi } from "vitest";

import { calendarPageController } from "../../src/modules/calendar-ssr/calendar-ssr.controller.js";
import { authPageService } from "../../src/modules/auth-ssr/auth-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/auth-ssr/auth-ssr.service.js", () => ({
    authPageService: { getComingSoonPageData: vi.fn() },
}));

describe("calendarPageController", () => {
    it("renders the calendar placeholder with the authenticated profile", async () => {
        const payload = {
            css: "coming-soon",
            activePage: "calendar",
            hideBrand: true,
            pageTitle: "Calendar",
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
        vi.mocked(authPageService.getComingSoonPageData).mockResolvedValue(payload);
        const req = { user: { userId: "account" } } as unknown as Request;
        const res = { setHeader: vi.fn(), render: vi.fn() };
        await calendarPageController.calendar(req, res as unknown as Response);
        expect(authPageService.getComingSoonPageData).toHaveBeenCalledExactlyOnceWith(
            "account",
            "Calendar",
            "calendar",
        );
        expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(res.render).toHaveBeenCalledWith("pages/coming-soon", payload);
    });

    it("redirects to login when the authenticated account is missing", async () => {
        const req = {} as Request;
        const res = { redirect: vi.fn(), render: vi.fn(), setHeader: vi.fn() };

        await calendarPageController.calendar(req, res as unknown as Response);

        expect(res.redirect).toHaveBeenCalledWith("/login");
        expect(authPageService.getComingSoonPageData).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
