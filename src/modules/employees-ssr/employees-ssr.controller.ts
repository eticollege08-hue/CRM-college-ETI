import { EMPLOYEES_PAGE } from "./employees-ssr.constants.js";
import { employeesPageService } from "./employees-ssr.service.js";

import type { Request, Response } from "express";

export const employeesPageController = {
    async index(_req: Request, res: Response) {
        const payload = await employeesPageService.getPageData();
        res.setHeader("Cache-Control", "no-store");
        res.render(EMPLOYEES_PAGE.path, { ...EMPLOYEES_PAGE.data, ...payload });
    },
};
