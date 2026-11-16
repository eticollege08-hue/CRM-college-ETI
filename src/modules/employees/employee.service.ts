import { HttpStatus } from "#constants/http-status.constants.js";
import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { ApiError } from "#utils/error.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeRepository } from "./employee.repository.js";

import type { Prisma } from "@prisma/client";
import type { HierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import type { JWT } from "#types/common.types.js";
import type { UserAccountService } from "#modules/user-accounts/user-account.service.js";
import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeUpdateInput } from "./employee.types.js";

type EmployeeActor = Pick<JWT, "userId" | "role" | "companyId">;

export class EmployeeService {
    constructor(
        private readonly repository: EmployeeRepository = employeeRepository,
        private readonly hierarchy: HierarchyService = hierarchyService,
        private readonly userAccounts: UserAccountService = userAccountService,
    ) {}

    async getAll(companyId: string) {
        return await this.repository.getAll(companyId);
    }

    async getById(id: string, companyId: string, tx?: Prisma.TransactionClient) {
        const employee = await this.repository.getById(id, companyId, tx);
        if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, EMPLOYEE_MESSAGES.NOT_FOUND);
        return employee;
    }

    async update(id: string, actor: EmployeeActor, data: EmployeeUpdateInput) {
        const { companyId } = actor;
        await this.getById(id, companyId);
        if (actor.role === "MANAGER") await this.checkDirectManager(id, actor);
        return await this.repository.update(id, companyId, data);
    }

    /* HELPERS */

    private async checkDirectManager(id: string, actor: EmployeeActor) {
        const actorEmployee = await this.userAccounts.getEmployeeByAccountId(actor.userId);
        const isManager =
            actorEmployee !== null &&
            actorEmployee.companyId === actor.companyId &&
            (await this.hierarchy.isManager(id, actorEmployee.id, actor.companyId));

        if (!isManager) {
            throw new ApiError(HttpStatus.FORBIDDEN, EMPLOYEE_MESSAGES.NOT_DIRECT_MANAGER);
        }
    }
}

export const employeeService = new EmployeeService();
