import { describe, expect, it, vi } from "vitest";

import { EmployeePersonalDataService } from "../../src/modules/employees/employee-personal-data.service.js";

import type { Role } from "@prisma/client";
import type { HierarchyService } from "../../src/modules/hierarchy/hierarchy.service.js";
import type { UserAccountService } from "../../src/modules/user-accounts/user-account.service.js";

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const accountId = "550e8400-e29b-41d4-a716-446655440010";
const viewerEmployeeId = "550e8400-e29b-41d4-a716-446655440011";
const targetId = "550e8400-e29b-41d4-a716-446655440012";

const actor = (role: Role) => ({ userId: accountId, role, companyId });
const employee = {
    id: targetId,
    companyId,
    fullName: "Olena Kovalenko",
    compensation: { salary: { toString: () => "4200.50" }, currency: "USD" },
};

function setup({ directManager = false, ownEmployeeId = viewerEmployeeId } = {}) {
    const hierarchy = { isManager: vi.fn().mockResolvedValue(directManager) };
    const userAccounts = {
        getEmployeeByAccountId: vi.fn().mockResolvedValue({ id: ownEmployeeId, companyId }),
    };
    const service = new EmployeePersonalDataService(
        hierarchy as unknown as HierarchyService,
        userAccounts as unknown as UserAccountService,
    );
    return { service, hierarchy, userAccounts };
}

describe("EmployeePersonalDataService", () => {
    it("returns salary for OWNER without hierarchy lookups", async () => {
        const { service, hierarchy, userAccounts } = setup();

        await expect(service.serialize(employee, actor("OWNER"))).resolves.toMatchObject({
            salary: 4200.5,
            currency: "USD",
        });
        expect(userAccounts.getEmployeeByAccountId).not.toHaveBeenCalled();
        expect(hierarchy.isManager).not.toHaveBeenCalled();
    });

    it("returns salary for HR without hierarchy lookups", async () => {
        const { service, hierarchy } = setup();

        await expect(service.serialize(employee, actor("HR"))).resolves.toMatchObject({
            salary: 4200.5,
        });
        expect(hierarchy.isManager).not.toHaveBeenCalled();
    });

    it("omits salary from the employee's own record", async () => {
        const { service } = setup({ ownEmployeeId: targetId });

        const result = await service.serialize(employee, actor("MANAGER"));

        expect(result).not.toHaveProperty("salary");
        await expect(service.mayAccess(actor("WORKER"), employee, "salary", "view")).resolves.toBe(
            false,
        );
    });

    it("returns salary to the direct manager but does not allow editing", async () => {
        const { service, hierarchy } = setup({ directManager: true });

        await expect(service.serialize(employee, actor("MANAGER"))).resolves.toMatchObject({
            salary: 4200.5,
        });
        await expect(service.mayAccess(actor("MANAGER"), employee, "salary", "edit")).resolves.toBe(
            false,
        );
        expect(hierarchy.isManager).toHaveBeenCalledWith(targetId, viewerEmployeeId, companyId);
    });

    it("omits salary completely for a higher-level manager", async () => {
        const { service } = setup({ directManager: false });

        const result = await service.serialize(employee, actor("MANAGER"));

        expect(result).not.toHaveProperty("salary");
        expect(result).not.toHaveProperty("currency");
        expect(result).not.toHaveProperty("compensation");
    });

    it.each<Role>(["WORKER", "RECRUITER"])("omits salary for %s", async (role) => {
        const { service } = setup();

        const result = await service.serialize(employee, actor(role));

        expect(result).not.toHaveProperty("salary");
        expect(result).not.toHaveProperty("currency");
        expect(result).not.toHaveProperty("compensation");
    });
});
