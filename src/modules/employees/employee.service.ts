import { Prisma } from "@prisma/client";

import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeRepository } from "./employee.repository.js";

import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeCreateInput, EmployeeUpdateInput } from "./employee.types.js";

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

    async create(data: EmployeeCreateInput) {
        await this.getById(data.managerId);
        try {
            return await this.repository.create(data);
        } catch (error: unknown) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ApiError(HttpStatus.CONFLICT, EMPLOYEE_MESSAGES.EMAIL_ALREADY_EXISTS);
            }
            throw error;
        }
    }

    async update(id: string, data: EmployeeUpdateInput) {
        await this.getById(id);
        return await this.repository.update(id, data);
    }
}

export const employeeService = new EmployeeService();
