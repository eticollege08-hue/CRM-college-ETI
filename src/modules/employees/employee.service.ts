import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeRepository } from "./employee.repository.js";

import type { Prisma } from "@prisma/client";
import type { EmployeeRepository } from "./employee.repository.js";

export class EmployeeService {
    constructor(private readonly repository: EmployeeRepository = employeeRepository) {}

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: string, tx?: Prisma.TransactionClient) {
        const employee = await this.repository.getById(id, tx);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return employee;
    }
}

export const employeeService = new EmployeeService();
