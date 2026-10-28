import { PAGE_DATA } from "./auth-ssr.constants.js";

export const authPageService = {
    async getLoginPageData() {
        return { ...PAGE_DATA.LOGIN };
    },
    async getHomePageData() {
        return {
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
    },
    async getRegisterPageData() {
        return { ...PAGE_DATA.REGISTER };
    },
};
