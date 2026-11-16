import { getAuthUser } from "#utils/auth-user.util.js";

import { PROJECTS_PAGE } from "./projects-ssr.constants.js";
import { projectsPageService } from "./projects-ssr.service.js";

import type { Request, Response } from "express";

export const projectsPageController = {
    async index(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const payload = await projectsPageService.getPageData(companyId);
        res.render(PROJECTS_PAGE.path, { ...PROJECTS_PAGE.data, ...payload });
    },
};
