import { PROJECTS_PAGE } from "./projects-ssr.constants.js";
import { projectsPageService } from "./projects-ssr.service.js";

import type { Request, Response } from "express";

export const projectsPageController = {
    async index(_req: Request, res: Response) {
        const payload = await projectsPageService.getPageData();
        res.render(PROJECTS_PAGE.path, { ...PROJECTS_PAGE.data, ...payload });
    },
};
