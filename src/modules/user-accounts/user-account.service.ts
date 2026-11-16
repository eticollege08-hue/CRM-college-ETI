import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import { employeeRepository } from "#modules/employees/employee.repository.js";

import { USER_ACCOUNT_MESSAGES } from "./user-account.constants.js";
import { userAccountRepository } from "./user-account.repository.js";

import type { EmployeeRepository } from "#modules/employees/employee.repository.js";
import type { UserAccountRepository } from "./user-account.repository.js";
import type {
    UserAccountCreateInput,
    UserAccountProfileUpdateInput,
} from "./user-account.types.js";

export class UserAccountService {
    constructor(
        private readonly repository: UserAccountRepository = userAccountRepository,
        private readonly employees: EmployeeRepository = employeeRepository,
    ) {}

    async create(data: UserAccountCreateInput, companyId: string) {
        const employee = await this.employees.getById(data.employeeId, companyId);
        if (!employee) {
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                USER_ACCOUNT_MESSAGES.EMPLOYEE_NOT_FOUND,
            );
        }

        const account = await this.repository.create(
            {
                ...data,
                email: data.email.trim().toLowerCase(),
            },
            companyId,
        );
        return account;
    }

    async getByEmail(email: string) {
        return await this.repository.getByEmail(email.trim().toLowerCase());
    }
    async getProfileById(accountId: string) {
        const profile = await this.repository.getProfileById(accountId);
        if (!profile) {
            throw new ApiError(HttpStatus.NOT_FOUND, USER_ACCOUNT_MESSAGES.PROFILE_NOT_FOUND);
        }
        return profile;
    }
    async updateProfile(accountId: string, data: UserAccountProfileUpdateInput) {
        await this.getProfileById(accountId);
        return await this.repository.updateProfile(accountId, data);
    }

    async getEmployeeByAccountId(accountId: string) {
        const employee = await this.repository.getEmployeeByAccountId(accountId);
        return employee;
    }

    async updateLastLoginAt(accountId: string) {
        return await this.repository.updateLastLoginAt(accountId, new Date());
    }

    async createSeedAccount(
        data: Pick<UserAccountCreateInput, "email" | "passwordHash" | "roleKey">,
        fullName: string,
        companyName: string,
    ) {
        return await this.repository.createSeedAccount(
            { ...data, email: data.email.trim().toLowerCase() },
            fullName,
            companyName,
        );
    }
}

export const userAccountService = new UserAccountService();
