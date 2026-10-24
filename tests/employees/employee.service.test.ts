import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmployeeService } from "../../src/modules/employees/employee.service.js";
import { EMPLOYEE_MESSAGES } from "../../src/modules/employees/employee.constants.js";

import type { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";
import type { HierarchyService } from "../../src/modules/hierarchy/hierarchy.service.js";
import type { UserAccountRepository } from "../../src/modules/user-accounts/user-account.repository.js";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));
vi.mock("#modules/hierarchy/hierarchy.service.js", () => ({ hierarchyService: {} }));

const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const accountId = "550e8400-e29b-41d4-a716-446655440001";
const managerId = "550e8400-e29b-41d4-a716-446655440002";
const managerAccount = {
    id: accountId,
    employeeId: managerId,
    email: "manager@example.com",
    passwordHash: "test-hash",
    roleKey: "MANAGER" as const,
    isActive: true,
    lastLoginAt: null,
};
const employee = {
    id: employeeId,
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};

describe("EmployeeService", () => {
    let repository: {
        create: ReturnType<typeof vi.fn>;
        getAll: ReturnType<typeof vi.fn>;
        getById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };
    let service: EmployeeService;
    const hierarchy = { isManager: vi.fn<HierarchyService["isManager"]>() };
    const accounts = { getById: vi.fn<UserAccountRepository["getById"]>() };

    beforeEach(() => {
        repository = {
            create: vi.fn(),
            getAll: vi.fn(),
            getById: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        hierarchy.isManager.mockReset();
        accounts.getById.mockReset();
        service = new EmployeeService(
            repository as unknown as EmployeeRepository,
            hierarchy as unknown as HierarchyService,
            accounts as unknown as UserAccountRepository,
        );
    });

    it("creates an employee from the supplied profile fields", async () => {
        repository.create.mockResolvedValue(employee);
        const input = { fullName: "Olena Kovalenko" };

        const result = await service.create(input);

        expect(repository.create).toHaveBeenCalledWith(input);
        expect(result).toEqual(employee);
    });

    it("returns all employees", async () => {
        repository.getAll.mockResolvedValue([employee]);

        const result = await service.getAll();

        expect(repository.getAll).toHaveBeenCalledOnce();
        expect(result).toEqual([employee]);
    });

    it("returns an existing employee by id", async () => {
        repository.getById.mockResolvedValue(employee);

        const result = await service.getById(employeeId);

        expect(repository.getById).toHaveBeenCalledWith(employeeId);
        expect(result).toEqual(employee);
    });

    it("throws not found when the employee does not exist", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.getById(employeeId)).rejects.toMatchObject({ status: 404 });
    });

    it("updates an existing employee", async () => {
        repository.getById.mockResolvedValue(employee);
        repository.update.mockResolvedValue({ ...employee, position: "Manager" });
        const input = { position: "Manager" };

        const result = await service.update(employeeId, input, "OWNER", accountId);

        expect(repository.getById).toHaveBeenCalledWith(employeeId);
        expect(repository.update).toHaveBeenCalledWith(employeeId, input);
        expect(result.position).toBe("Manager");
    });

    it("does not update a missing employee", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(
            service.update(employeeId, { position: "Manager" }, "OWNER", accountId),
        ).rejects.toMatchObject({
            status: 404,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    describe("manager update access", () => {
        beforeEach(() => {
            repository.getById.mockResolvedValue(employee);
            accounts.getById.mockResolvedValue(managerAccount);
        });

        it("allows a direct manager and resolves their employee ID from the account", async () => {
            hierarchy.isManager.mockResolvedValue(true);
            repository.update.mockResolvedValue(employee);

            await expect(service.update(employeeId, {}, "MANAGER", accountId)).resolves.toEqual(
                employee,
            );

            expect(accounts.getById).toHaveBeenCalledWith(accountId);
            expect(hierarchy.isManager).toHaveBeenCalledWith(employeeId, managerId);
            expect(repository.update).toHaveBeenCalledWith(employeeId, {});
        });

        it("rejects a manager without a direct relationship before writing", async () => {
            hierarchy.isManager.mockResolvedValue(false);

            await expect(
                service.update(employeeId, {}, "MANAGER", accountId),
            ).rejects.toMatchObject({
                status: 403,
                message: EMPLOYEE_MESSAGES.NOT_DIRECT_MANAGER,
            });
            expect(repository.update).not.toHaveBeenCalled();
        });

        it("rejects a missing manager account without querying the hierarchy", async () => {
            accounts.getById.mockResolvedValue(null);

            await expect(
                service.update(employeeId, {}, "MANAGER", accountId),
            ).rejects.toMatchObject({
                status: 403,
                message: EMPLOYEE_MESSAGES.NOT_DIRECT_MANAGER,
            });
            expect(hierarchy.isManager).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        });

        it.each(["OWNER", "HR"] as const)("allows %s without hierarchy checks", async (role) => {
            repository.update.mockResolvedValue(employee);

            await expect(service.update(employeeId, {}, role, accountId)).resolves.toEqual(
                employee,
            );

            expect(accounts.getById).not.toHaveBeenCalled();
            expect(hierarchy.isManager).not.toHaveBeenCalled();
        });

        it("preserves 404 for a missing target employee", async () => {
            repository.getById.mockResolvedValue(null);

            await expect(
                service.update(employeeId, {}, "MANAGER", accountId),
            ).rejects.toMatchObject({ status: 404 });
            expect(accounts.getById).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        });

        it("propagates hierarchy errors without updating the employee", async () => {
            const error = new Error("Hierarchy lookup failed");
            hierarchy.isManager.mockRejectedValue(error);

            await expect(service.update(employeeId, {}, "MANAGER", accountId)).rejects.toBe(error);
            expect(repository.update).not.toHaveBeenCalled();
        });
    });

    it("deletes an existing employee", async () => {
        repository.getById.mockResolvedValue(employee);
        repository.delete.mockResolvedValue(employee);

        const result = await service.delete(employeeId);

        expect(repository.getById).toHaveBeenCalledWith(employeeId);
        expect(repository.delete).toHaveBeenCalledWith(employeeId);
        expect(result).toEqual(employee);
    });

    it("does not delete a missing employee", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.delete(employeeId)).rejects.toMatchObject({ status: 404 });
        expect(repository.delete).not.toHaveBeenCalled();
    });
});
