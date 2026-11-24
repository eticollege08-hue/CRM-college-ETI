import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";
import { uuidSchema } from "#schemas/id.schema.js";
import {
    PROJECTS_PAGE,
    PROJECT_CREATE_PAGE,
    PROJECT_DETAILS_PAGE,
} from "./projects-ssr.constants.js";
import { projectsPageService } from "./projects-ssr.service.js";

import type { Request, Response } from "express";

export const projectsPageController = {
    async index(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const [profileData, pageData] = await Promise.all([
            authPageService.getProfilePageData(accountId),
            projectsPageService.getPageData(),
        ]);
        const payload = { ...profileData, ...pageData, hideBrand: true };
        res.render(PROJECTS_PAGE.path, { ...payload, ...PROJECTS_PAGE.data });
    },
    async details(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const { id } = uuidSchema.parse(req.params);
        const [profileData, pageData] = await Promise.all([
            authPageService.getProfilePageData(accountId),
            projectsPageService.getProject(id),
        ]);
        const payload = { ...profileData, ...pageData, hideBrand: true };
        res.setHeader("Cache-Control", "no-store");
        res.render(PROJECT_DETAILS_PAGE.path, { ...payload, ...PROJECT_DETAILS_PAGE.data });
    },
    async createPage(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const [profileData, pageData] = await Promise.all([
            authPageService.getProfilePageData(accountId),
            projectsPageService.getCreatePageData(),
        ]);
        const payload = { ...profileData, ...pageData, hideBrand: true };
        res.setHeader("Cache-Control", "no-store");
        res.render(PROJECT_CREATE_PAGE.path, { ...payload, ...PROJECT_CREATE_PAGE.data });
    },
};
