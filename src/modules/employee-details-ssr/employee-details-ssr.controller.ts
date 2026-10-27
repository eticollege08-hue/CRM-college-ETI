import { uuidSchema } from "#schemas/id.schema.js";

import { EMPLOYEE_DETAILS_PAGE } from "./employee-details-ssr.constants.js";
import { employeeDetailsPageService } from "./employee-details-ssr.service.js";

import type { Request, Response } from "express";

export const employeeDetailsPageController = {
    async index(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const payload = await employeeDetailsPageService.getPageData(id);
        res.render(EMPLOYEE_DETAILS_PAGE.path, { ...EMPLOYEE_DETAILS_PAGE.data, ...payload });
    },
};
