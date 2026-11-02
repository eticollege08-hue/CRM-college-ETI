import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";

import { PAGE_PATH, PAGE_DATA } from "./hierarchy-ssr.constants.js";
import { hierarchyPageService } from "./hierarchy-ssr.service.js";

import type { Request, Response } from "express";

export const hierarchyPageController = {
    async hierarchyTree(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const [payload, profileData] = await Promise.all([
            hierarchyPageService.hierarchyTree(accountId),
            authPageService.getProfilePageData(accountId),
        ]);
        res.render(PAGE_PATH.HIERARCHY, { ...profileData, ...payload, ...PAGE_DATA.HIERARCHY });
    },
};
