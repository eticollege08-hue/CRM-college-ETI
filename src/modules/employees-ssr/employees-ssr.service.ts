import { employeeService } from "#modules/employees/employee.service.js";

export const employeesPageService = {
    async getPageData() {
        return { employees: await employeeService.getAll() };
    },
};
