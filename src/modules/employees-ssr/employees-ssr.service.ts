import { employeeService } from "#modules/employees/employee.service.js";

export const employeesPageService = {
    async getPageData(companyId: string) {
        const employees = await employeeService.getAll(companyId);
        return { employees };
    },

    async getProfilePageData(employeeId: string, companyId: string) {
        const employee = await employeeService.getById(employeeId, companyId);
        return { employee };
    },
};
