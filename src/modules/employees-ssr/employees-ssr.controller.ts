import { uuidSchema } from "#schemas/id.schema.js";

import { EMPLOYEE_DETAILS_PAGE, EMPLOYEES_PAGE } from "./employees-ssr.constants.js";
import { employeesPageService } from "./employees-ssr.service.js";

import type { Request, Response } from "express";

export const employeesPageController = {
    async index(_req: Request, res: Response) {
        const payload = await employeesPageService.getPageData();
        res.render(EMPLOYEES_PAGE.path, { ...EMPLOYEES_PAGE.data, ...payload });
    },

    async profile(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const payload = await employeesPageService.getProfilePageData(id);
        res.render(EMPLOYEE_DETAILS_PAGE.path, { ...EMPLOYEE_DETAILS_PAGE.data, ...payload });
    },
};
