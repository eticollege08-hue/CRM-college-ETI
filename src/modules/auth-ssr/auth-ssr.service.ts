import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { eventService } from "#modules/events/event.service.js";

import { PAGE_DATA } from "./auth-ssr.constants.js";

export const authPageService = {
    async getLoginPageData() {
        return { ...PAGE_DATA.LOGIN };
    },
    async getHomePageData(accountId?: string) {
        const pageData = { ...PAGE_DATA.HOME, todayEvents: [] };
        if (!accountId) return pageData;

        const profileData = await this.getProfilePageData(accountId);
        const events = await eventService.getParticipantEventsToday(
            profileData.profile.employee.id,
        );
        const todayEvents = events.map((event) => ({
            name: event.title,
            startTime: event.startsAt.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            }),
            endTime: event.endsAt.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            }),
        }));

        return { ...pageData, profile: profileData.profile, todayEvents };
    },
    async getRegisterPageData() {
        return { ...PAGE_DATA.REGISTER };
    },
    async getProfilePageData(accountId: string) {
        const account = await userAccountService.getProfileById(accountId);
        const initials = (account.employee.fullName ?? "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toLocaleUpperCase() ?? "")
            .join("");
        const profile = { ...account, initials };
        return { ...PAGE_DATA.PROFILE, profile };
    },
    async getComingSoonPageData(accountId: string, pageTitle: string, activePage: string) {
        const { profile } = await this.getProfilePageData(accountId);
        return {
            css: "coming-soon",
            activePage,
            hideBrand: true,
            pageTitle,
            profile,
        };
    },
};
