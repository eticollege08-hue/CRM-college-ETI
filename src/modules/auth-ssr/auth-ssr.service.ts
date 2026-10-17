import { PAGE_DATA } from "./auth-ssr.constants.js";

export const authPageService = {
    async getLoginPageData() {
        return { ...PAGE_DATA.LOGIN };
    },
    async getRegisterPageData() {
        return { ...PAGE_DATA.REGISTER };
    },
};
