import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";

import type { JWT } from "#types/common.types.js";
import type { HierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import type { UserAccountService } from "#modules/user-accounts/user-account.service.js";

export type ProtectedEmployeeField = "salary";
export type ProtectedFieldAction = "view" | "edit";

type EmployeeWithCompensation = {
    id: string;
    companyId: string;
    compensation?: { salary: { toString(): string }; currency: string } | null;
};

export class EmployeePersonalDataService {
    constructor(
        private readonly hierarchy: HierarchyService = hierarchyService,
        private readonly userAccounts: UserAccountService = userAccountService,
    ) {}

    async mayAccess(
        actor: Pick<JWT, "userId" | "role" | "companyId">,
        employee: Pick<EmployeeWithCompensation, "id" | "companyId">,
        field: ProtectedEmployeeField,
        action: ProtectedFieldAction,
    ) {
        if (field !== "salary" || employee.companyId !== actor.companyId) return false;
        if (actor.role === "OWNER" || actor.role === "HR") return true;

        const actorEmployee = await this.userAccounts.getEmployeeByAccountId(actor.userId);
        if (!actorEmployee || actorEmployee.companyId !== actor.companyId) return false;
        if (actorEmployee.id === employee.id) return action === "view";

        return (
            actor.role === "MANAGER" &&
            (await this.hierarchy.isManager(employee.id, actorEmployee.id, actor.companyId))
        );
    }

    async serialize<T extends EmployeeWithCompensation>(
        employee: T,
        actor: Pick<JWT, "userId" | "role" | "companyId">,
    ) {
        const publicEmployee = { ...employee };
        delete publicEmployee.compensation;
        if (!(await this.mayAccess(actor, employee, "salary", "view")) || !employee.compensation) {
            return publicEmployee;
        }
        return {
            ...publicEmployee,
            salary: Number(employee.compensation.salary.toString()),
            currency: employee.compensation.currency,
        };
    }

    async serializeMany<T extends EmployeeWithCompensation>(
        employees: T[],
        actor: Pick<JWT, "userId" | "role" | "companyId">,
    ) {
        return await Promise.all(employees.map((employee) => this.serialize(employee, actor)));
    }
}

export const employeePersonalDataService = new EmployeePersonalDataService();
