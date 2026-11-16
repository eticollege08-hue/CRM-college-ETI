import { HttpStatus } from "#constants/http-status.constants.js";
import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { ApiError } from "#utils/error.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeePersonalDataService } from "./employee-personal-data.service.js";
import { employeeRepository } from "./employee.repository.js";

import type { Prisma } from "@prisma/client";
import type { HierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import type { JWT } from "#types/common.types.js";
import type { UserAccountService } from "#modules/user-accounts/user-account.service.js";
import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeePersonalDataService } from "./employee-personal-data.service.js";
import type { EmployeeSalaryUpdateInput, EmployeeUpdateInput } from "./employee.types.js";

type EmployeeActor = Pick<JWT, "userId" | "role" | "companyId">;

export class EmployeeService {
    constructor(
        private readonly repository: EmployeeRepository = employeeRepository,
        private readonly hierarchy: HierarchyService = hierarchyService,
        private readonly userAccounts: UserAccountService = userAccountService,
        private readonly personalData: EmployeePersonalDataService = employeePersonalDataService,
    ) {}

    async getAll(actor: EmployeeActor | string) {
        const companyId = typeof actor === "string" ? actor : actor.companyId;
        const employees = await this.repository.getAll(companyId);
        if (typeof actor === "string") {
            return employees.map(({ compensation, ...employee }) => {
                void compensation;
                return employee;
            });
        }
        return await this.personalData.serializeMany(employees, actor);
    }

    async getById(id: string, actor: EmployeeActor | string) {
        const companyId = typeof actor === "string" ? actor : actor.companyId;
        const employee = await this.repository.getWithCompensation(id, companyId);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        if (typeof actor === "string") {
            const { compensation, ...publicEmployee } = employee;
            void compensation;
            return publicEmployee;
        }
        return await this.personalData.serialize(employee, actor);
    }

    async update(id: string, actor: EmployeeActor, data: EmployeeUpdateInput) {
        const { companyId } = actor;
        await this.getRawById(id, companyId);
        if (actor.role === "MANAGER") await this.checkDirectManager(id, actor);
        return await this.repository.update(id, companyId, data);
    }

    async updateSalary(id: string, actor: EmployeeActor, data: EmployeeSalaryUpdateInput) {
        const employee = await this.getRawById(id, actor.companyId);
        if (!(await this.personalData.mayAccess(actor, employee, "salary", "edit"))) {
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        }
        return await this.repository.upsertCompensation(
            id,
            actor.companyId,
            data.salary,
            data.currency,
        );
    }

    /* HELPERS */

    private async checkDirectManager(id: string, actor: EmployeeActor) {
        const actorEmployee = await this.userAccounts.getEmployeeByAccountId(actor.userId);
        const isManager =
            actorEmployee !== null &&
            actorEmployee.companyId === actor.companyId &&
            (await this.hierarchy.isManager(id, actorEmployee.id, actor.companyId));

        if (!isManager) {
            throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        }
    }

    private async getRawById(id: string, companyId: string, tx?: Prisma.TransactionClient) {
        const employee = await this.repository.getById(id, companyId, tx);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return employee;
    }
}

export const employeeService = new EmployeeService();
