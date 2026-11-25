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

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ companyId, deletedAt: null }),
            }),
        );
    });

    it("looks up and updates an employee by ID together with its company", async () => {
        const findUnique = vi.fn().mockResolvedValue(null);
        const update = vi.fn().mockResolvedValue({});
        const repository = new EmployeeRepository({
            employee: { findUnique, update },
        } as unknown as PrismaClient);

        await expect(repository.getById(employeeId, companyId)).resolves.toBeNull();
        await repository.update(employeeId, companyId, { position: "HR" });

        expect(findUnique).toHaveBeenCalledWith({
            where: { id: employeeId, companyId, deletedAt: null },
        });
        expect(update).toHaveBeenCalledWith({
            where: { id: employeeId, companyId, deletedAt: null },
            data: { position: "HR" },
        });
    });
    it("creates compensation and account inside the employee transaction", async () => {
        const employee = { create: vi.fn().mockResolvedValue({ id: employeeId }) };
        const tx = {
            employee,
            employeeCompensation: { create: vi.fn() },
            userAccount: { create: vi.fn() },
        };
        const repository = new EmployeeRepository({
            $transaction: vi.fn((fn) => fn(tx)),
        } as unknown as PrismaClient);
        await repository.create(companyId, { email: "a@example.com", role: "WORKER" }, "hash");
        expect(tx.employeeCompensation.create).toHaveBeenCalledWith({
            data: { companyId, employeeId, salary: undefined },
        });
        expect(tx.userAccount.create).toHaveBeenCalledWith({
            data: {
                companyId,
                employeeId,
                email: "a@example.com",
                roleKey: "WORKER",
                passwordHash: "hash",
            },
        });
    });
    it("requires an explicit destination for a dismissed manager's reports", async () => {
        const tx = {
            employee: {
                findUnique: vi.fn().mockResolvedValue({ id: employeeId }),
                update: vi.fn(),
            },
            userAccount: { findFirst: vi.fn().mockResolvedValue(null) },
            hierarchy: {
                findMany: vi.fn().mockResolvedValue([{ subordinateId: "report" }]),
                deleteMany: vi.fn(),
            },
        };
        const repository = new EmployeeRepository({
            $transaction: vi.fn((fn) => fn(tx)),
        } as unknown as PrismaClient);
        await expect(repository.dismiss(employeeId, companyId, "actor", undefined)).rejects.toThrow(
            "Choose a replacement",
        );
        expect(tx.hierarchy.deleteMany).not.toHaveBeenCalled();
        expect(tx.employee.update).not.toHaveBeenCalled();
    });
});
