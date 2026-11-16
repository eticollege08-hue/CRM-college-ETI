import { describe, expect, it, vi } from "vitest";

import { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";

import type { PrismaClient } from "@prisma/client";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const employeeId = "550e8400-e29b-41d4-a716-446655440000";

describe("EmployeeRepository tenant scoping", () => {
    it("lists only employees of the given company", async () => {
        const findMany = vi.fn().mockResolvedValue([]);
        const repository = new EmployeeRepository({
            employee: { findMany },
        } as unknown as PrismaClient);

        await repository.getAll(companyId);

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId } }));
    });

    it("looks up and updates an employee by ID together with its company", async () => {
        const findUnique = vi.fn().mockResolvedValue(null);
        const update = vi.fn().mockResolvedValue({});
        const repository = new EmployeeRepository({
            employee: { findUnique, update },
        } as unknown as PrismaClient);

        await expect(repository.getById(employeeId, companyId)).resolves.toBeNull();
        await repository.update(employeeId, companyId, { position: "HR" });

        expect(findUnique).toHaveBeenCalledWith({ where: { id: employeeId, companyId } });
        expect(update).toHaveBeenCalledWith({
            where: { id: employeeId, companyId },
            data: { position: "HR" },
        });
    });
});
