import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import { EMPLOYEE_PROFILE_PAGE } from "./employee-profile-ssr.constants.js";
import { employeeProfilePageService } from "./employee-profile-ssr.service.js";

import type { Request, Response } from "express";

export const employeeProfilePageController = {
    async index(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) {
            throw new ApiError(HttpStatus.UNAUTHORIZED, "Authentication is required.");
        }

        const payload = await employeeProfilePageService.getPageData(accountId);
        res.render(EMPLOYEE_PROFILE_PAGE.path, { ...EMPLOYEE_PROFILE_PAGE.data, ...payload });
    },
};
