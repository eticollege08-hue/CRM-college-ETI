import { PAGE_PATH } from "./auth-ssr.constants.js";
import { authPageService } from "./auth-ssr.service.js";

import type { Request, Response } from "express";

export const authPageController = {
    async login(_req: Request, res: Response) {
        const data = await authPageService.getLoginPageData();
        res.render(PAGE_PATH.LOGIN, data);
    },
    async home(_req: Request, res: Response) {
        const data = await authPageService.getHomePageData();
        res.render(PAGE_PATH.HOME, data);
    },
    async register(_req: Request, res: Response) {
        const data = await authPageService.getRegisterPageData();
        res.render(PAGE_PATH.REGISTER, data);
    },
};
