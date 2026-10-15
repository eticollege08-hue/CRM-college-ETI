import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmployeeService } from "../../src/modules/employees/employee.service.js";

import type { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const employeeId = "550e8400-e29b-41d4-a716-446655440000";
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

    beforeEach(() => {
        repository = {
            create: vi.fn(),
            getAll: vi.fn(),
            getById: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        service = new EmployeeService(repository as unknown as EmployeeRepository);
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

        const result = await service.update(employeeId, input);

        expect(repository.getById).toHaveBeenCalledWith(employeeId);
        expect(repository.update).toHaveBeenCalledWith(employeeId, input);
        expect(result.position).toBe("Manager");
    });

    it("does not update a missing employee", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.update(employeeId, { position: "Manager" })).rejects.toMatchObject({
            status: 404,
        });
        expect(repository.update).not.toHaveBeenCalled();
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
