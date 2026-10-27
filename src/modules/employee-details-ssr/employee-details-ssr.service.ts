import { employeeService } from "#modules/employees/employee.service.js";

export const employeeDetailsPageService = {
    async getPageData(employeeId: string) {
        const employee = await employeeService.getById(employeeId);
        return { employee };
    },
};
