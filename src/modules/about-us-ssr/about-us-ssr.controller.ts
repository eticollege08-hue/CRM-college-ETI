import { getAuthUser } from "#utils/auth-user.util.js";

import { ABOUT_US_PAGE } from "./about-us-ssr.constants.js";
import { aboutUsPageService } from "./about-us-ssr.service.js";

import type { Request, Response } from "express";

export const aboutUsPageController = {
    async index(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const payload = await aboutUsPageService.getPageData(companyId);
        res.render(ABOUT_US_PAGE.path, { ...ABOUT_US_PAGE.data, ...payload });
    },
};
