import { employeeService } from "#modules/employees/employee.service.js";

export const employeesPageService = {
    async getPageData() {
        const employees = await employeeService.getAll();
        return { employees };
    },

    async getProfilePageData(employeeId: string) {
        const employee = await employeeService.getById(employeeId);
        return { employee };
    },
};
