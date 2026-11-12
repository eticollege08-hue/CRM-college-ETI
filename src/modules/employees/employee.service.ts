import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeRepository } from "./employee.repository.js";

import type { Prisma } from "@prisma/client";
import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeUpdateInput } from "./employee.types.js";

export class EmployeeService {
    constructor(private readonly repository: EmployeeRepository = employeeRepository) {}

    async getAll(companyId: string) {
        return await this.repository.getAll(companyId);
    }

    async getById(id: string, companyId: string, tx?: Prisma.TransactionClient) {
        const employee = await this.repository.getById(id, companyId, tx);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return employee;
    }

    async update(id: string, companyId: string, data: EmployeeUpdateInput) {
        await this.getById(id, companyId);
        return await this.repository.update(id, companyId, data);
    }
}

export const employeeService = new EmployeeService();
