import { ABOUT_US_PAGE } from "./about-us-ssr.constants.js";
import { aboutUsPageService } from "./about-us-ssr.service.js";

import type { Request, Response } from "express";

export const aboutUsPageController = {
    async index(_req: Request, res: Response) {
        const payload = await aboutUsPageService.getPageData();
        res.render(ABOUT_US_PAGE.path, { ...ABOUT_US_PAGE.data, ...payload });
    },
};
