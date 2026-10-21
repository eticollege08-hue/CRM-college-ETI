import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";

import { EMPLOYEE_PROFILE_MESSAGES } from "./employee-profile-ssr.constants.js";

export const employeeProfilePageService = {
    async getPageData(accountId: string) {
        const employee = await userAccountService.getEmployeeByAccountId(accountId);
        if (!employee) {
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_PROFILE_MESSAGES.NOT_FOUND);
        }

        return { employee };
    },
};
