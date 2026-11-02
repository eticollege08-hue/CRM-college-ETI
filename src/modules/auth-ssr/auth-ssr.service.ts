import { userAccountService } from "#modules/user-accounts/user-account.service.js";

import { PAGE_DATA } from "./auth-ssr.constants.js";

export const authPageService = {
    async getLoginPageData() {
        return { ...PAGE_DATA.LOGIN };
    },
    async getHomePageData(accountId?: string) {
        const pageData = {
            ...PAGE_DATA.HOME,
            team: [
                {
                    name: "User Name",
                    position: "CEO · Level 1",
                    role: "CRM Owner",
                    roleClass: "role-hr",
                    initials: "UN",
                    depth: 0,
                },
                {
                    name: "User Name",
                    position: "CTO · Level 2",
                    role: "CRM Manager",
                    roleClass: "role-team",
                    initials: "UN",
                    depth: 1,
                },
                {
                    name: "User Name",
                    position: "HR Manager · Level 3",
                    role: "CRM HR",
                    roleClass: "role-hr",
                    initials: "UN",
                    depth: 2,
                },
                {
                    name: "User Name",
                    position: "Developer · Level 3",
                    role: "CRM Developer",
                    roleClass: "role-lead",
                    initials: "UN",
                    depth: 2,
                },
                {
                    name: "User Name",
                    position: "Recruiter · Level 3",
                    role: "CRM Recruiter",
                    roleClass: "role-lead",
                    initials: "UN",
                    depth: 2,
                },
                {
                    name: "User Name",
                    position: "Sales Specialist · Level 3",
                    role: "CRM Worker",
                    roleClass: "role-team",
                    initials: "UN",
                    depth: 2,
                },
            ],
        };
        if (!accountId) return pageData;
        const { profile } = await this.getProfilePageData(accountId);
        return { ...pageData, profile };
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
