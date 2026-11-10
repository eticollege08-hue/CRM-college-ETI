import { beforeEach, describe, expect, it, vi } from "vitest";

import { authPageService } from "../../src/modules/auth-ssr/auth-ssr.service.js";
import { eventService } from "../../src/modules/events/event.service.js";
import { userAccountService } from "../../src/modules/user-accounts/user-account.service.js";

vi.mock("../../src/modules/events/event.service.js", () => ({
    eventService: { getParticipantEventsToday: vi.fn() },
}));
vi.mock("../../src/modules/user-accounts/user-account.service.js", () => ({
    userAccountService: { getProfileById: vi.fn() },
}));

const profile = {
    email: "employee@example.com",
    roleKey: "WORKER" as const,
    employee: {
        id: "employee-id",
        fullName: "Alex Employee",
        position: "Employee",
        level: null,
        phoneNumber: null,
        slack: null,
        telegram: null,
        viber: null,
        whatsapp: null,
        discord: null,
    },
};

describe("authPageService home page data", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(userAccountService.getProfileById).mockResolvedValue(profile);
    });

    it("returns today's events attached to the authenticated employee and standard page data", async () => {
        const startsAt = new Date("2026-11-10T09:30:00.000Z");
        const endsAt = new Date("2026-11-10T10:30:00.000Z");
        vi.mocked(eventService.getParticipantEventsToday).mockResolvedValue([
            { title: "Daily meeting", startsAt, endsAt },
        ]);

        const pageData = await authPageService.getHomePageData("account-id");

        expect(eventService.getParticipantEventsToday).toHaveBeenCalledExactlyOnceWith(
            "employee-id",
        );
        expect(pageData).toMatchObject({
            css: "home",
            js: "",
            activePage: "home",
            hideBrand: true,
            profile: { employee: { id: "employee-id" } },
            todayEvents: [
                {
                    name: "Daily meeting",
                    startTime: startsAt.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    endTime: endsAt.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                },
            ],
        });
    });

    it("renders an empty events list when the employee has no events today", async () => {
        vi.mocked(eventService.getParticipantEventsToday).mockResolvedValue([]);

        const pageData = await authPageService.getHomePageData("account-id");

        expect(pageData.todayEvents).toEqual([]);
    });

    it("provides the standard page data and an empty list for the design preview", async () => {
        const pageData = await authPageService.getHomePageData();

        expect(pageData).toMatchObject({ css: "home", js: "", activePage: "home" });
        expect(pageData.todayEvents).toEqual([]);
        expect(userAccountService.getProfileById).not.toHaveBeenCalled();
        expect(eventService.getParticipantEventsToday).not.toHaveBeenCalled();
    });
});
