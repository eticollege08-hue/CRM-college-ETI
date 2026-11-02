import { PAGE_PATH } from "./auth-ssr.constants.js";
import { authPageService } from "./auth-ssr.service.js";

import type { Request, Response } from "express";

export const authPageController = {
    async login(_req: Request, res: Response) {
        const data = await authPageService.getLoginPageData();
        res.render(PAGE_PATH.LOGIN, data);
    },
    async home(req: Request, res: Response) {
        const data = await authPageService.getHomePageData(req.user?.userId);
        res.render(PAGE_PATH.HOME, data);
    },
    async register(_req: Request, res: Response) {
        const data = await authPageService.getRegisterPageData();
        res.render(PAGE_PATH.REGISTER, data);
    },
    async profile(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const data = await authPageService.getProfilePageData(accountId);
        res.render(PAGE_PATH.PROFILE, data);
    },
    async comingSoon(req: Request, res: Response, pageTitle: string, activePage: string) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const data = await authPageService.getComingSoonPageData(accountId, pageTitle, activePage);
        res.render(PAGE_PATH.COMING_SOON, data);
    },
};
