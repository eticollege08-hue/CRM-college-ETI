import { describe, expect, it, vi } from "vitest";

import { EMPLOYEE_MESSAGES } from "../../src/modules/employees/employee.constants.js";
import { EmployeeService } from "../../src/modules/employees/employee.service.js";

import type { Role } from "@prisma/client";
import type { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";
import type { HierarchyService } from "../../src/modules/hierarchy/hierarchy.service.js";
import type { UserAccountService } from "../../src/modules/user-accounts/user-account.service.js";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const otherCompanyId = "550e8400-e29b-41d4-a716-4466554400c2";
const accountId = "550e8400-e29b-41d4-a716-446655440010";
const managerEmployeeId = "550e8400-e29b-41d4-a716-446655440001";
const targetId = "550e8400-e29b-41d4-a716-446655440002";
const data = { position: "Developer" };

const employee = (id: string, employeeCompanyId = companyId) => ({
    id,
    companyId: employeeCompanyId,
    fullName: null,
    imageId: null,
    level: null,
    position: null,
    phoneNumber: null,
    slack: null,
    telegram: null,
    viber: null,
    whatsapp: null,
    discord: null,
});

const actor = (role: Role) => ({ userId: accountId, role, companyId });

function setup({
    target = employee(targetId),
    actorEmployee = employee(managerEmployeeId),
    isManager = true,
}: {
    target?: ReturnType<typeof employee> | null;
    actorEmployee?: ReturnType<typeof employee> | null;
    isManager?: boolean;
} = {}) {
    const repository = {
        getById: vi.fn().mockResolvedValue(target),
        update: vi.fn().mockResolvedValue(target),
    };
    const hierarchy = { isManager: vi.fn().mockResolvedValue(isManager) };
    const userAccounts = { getEmployeeByAccountId: vi.fn().mockResolvedValue(actorEmployee) };
    const service = new EmployeeService(
        repository as unknown as EmployeeRepository,
        hierarchy as unknown as HierarchyService,
        userAccounts as unknown as UserAccountService,
    );

    return { service, repository, hierarchy, userAccounts };
}

describe("EmployeeService.update", () => {
    it("lets a manager update a direct subordinate", async () => {
        const { service, repository, hierarchy, userAccounts } = setup();

        await service.update(targetId, actor("MANAGER"), data);

        expect(userAccounts.getEmployeeByAccountId).toHaveBeenCalledWith(accountId);
        expect(hierarchy.isManager).toHaveBeenCalledWith(targetId, managerEmployeeId, companyId);
        expect(repository.update).toHaveBeenCalledWith(targetId, companyId, data);
    });

    it("rejects a manager updating an employee who is not a direct subordinate", async () => {
        const { service, repository } = setup({ isManager: false });

        await expect(service.update(targetId, actor("MANAGER"), data)).rejects.toMatchObject({
            status: 403,
            message: EMPLOYEE_MESSAGES.NOT_DIRECT_MANAGER,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("rejects a manager whose account has no employee in the company", async () => {
        const { service, repository, hierarchy } = setup({
            actorEmployee: employee(managerEmployeeId, otherCompanyId),
        });

        await expect(service.update(targetId, actor("MANAGER"), data)).rejects.toMatchObject({
            status: 403,
        });
        expect(hierarchy.isManager).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("rejects a manager whose account has no employee", async () => {
        const { service, repository } = setup({ actorEmployee: null });

        await expect(service.update(targetId, actor("MANAGER"), data)).rejects.toMatchObject({
            status: 403,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it.each<Role>(["OWNER", "HR", "RECRUITER"])(
        "lets %s update any employee in the company without a hierarchy check",
        async (role) => {
            const { service, repository, hierarchy, userAccounts } = setup({ isManager: false });

            await service.update(targetId, actor(role), data);

            expect(userAccounts.getEmployeeByAccountId).not.toHaveBeenCalled();
            expect(hierarchy.isManager).not.toHaveBeenCalled();
            expect(repository.update).toHaveBeenCalledWith(targetId, companyId, data);
        },
    );

    it.each<Role>(["MANAGER", "OWNER"])(
        "returns 404 to %s when the employee is missing in the company",
        async (role) => {
            const { service, repository, hierarchy } = setup({ target: null });

            await expect(service.update(targetId, actor(role), data)).rejects.toMatchObject({
                status: 404,
                message: EMPLOYEE_MESSAGES.NOT_FOUND,
            });
            expect(repository.getById).toHaveBeenCalledWith(targetId, companyId, undefined);
            expect(hierarchy.isManager).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        },
    );
});
