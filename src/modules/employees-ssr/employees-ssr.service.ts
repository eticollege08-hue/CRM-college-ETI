import { employeeService } from "#modules/employees/employee.service.js";

import type { JWT } from "#types/common.types.js";

export const employeesPageService = {
    async getPageData(actor: JWT | string) {
        const employees = await employeeService.getAll(actor);
        return { employees };
    },

    async getProfilePageData(employeeId: string, actor: JWT | string) {
        const employee = await employeeService.getById(employeeId, actor);
        return { employee };
    },
};
