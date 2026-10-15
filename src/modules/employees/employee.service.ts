import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeRepository } from "./employee.repository.js";

import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeCreateInput, EmployeeUpdateInput } from "./employee.types.js";

export class EmployeeService {
    constructor(private readonly repository: EmployeeRepository = employeeRepository) {}

    async create(data: EmployeeCreateInput) {
        return await this.repository.create(data);
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: string) {
        const employee = await this.repository.getById(id);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return employee;
    }

    async update(id: string, data: EmployeeUpdateInput) {
        await this.getById(id);
        return await this.repository.update(id, data);
    }

    async delete(id: string) {
        await this.getById(id);
        return await this.repository.delete(id);
    }
}

export const employeeService = new EmployeeService();
