import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import { employeeRepository } from "#modules/employees/employee.repository.js";

import { USER_ACCOUNT_MESSAGES } from "./user-account.constants.js";
import { userAccountRepository } from "./user-account.repository.js";

import type { EmployeeRepository } from "#modules/employees/employee.repository.js";
import type { UserAccountRepository } from "./user-account.repository.js";
import type { UserAccountCreateInput } from "./user-account.types.js";

export class UserAccountService {
    constructor(
        private readonly repository: UserAccountRepository = userAccountRepository,
        private readonly employees: EmployeeRepository = employeeRepository,
    ) {}

    async create(data: UserAccountCreateInput) {
        const employee = await this.employees.getById(data.employeeId);
        if (!employee) {
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                USER_ACCOUNT_MESSAGES.EMPLOYEE_NOT_FOUND,
            );
        }

        const account = await this.repository.create({ ...data, email: data.email.toLowerCase() });
        return account;
    }

    async getByEmail(email: string) {
        return await this.repository.getByEmail(email.toLowerCase());
    }

    async getEmployeeByAccountId(accountId: string) {
        const employee = await this.repository.getEmployeeByAccountId(accountId);
        return employee;
    }
}

export const userAccountService = new UserAccountService();
