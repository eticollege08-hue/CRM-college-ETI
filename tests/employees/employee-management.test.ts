import { describe, expect, it, vi } from "vitest";
import { EmployeeController } from "../../src/modules/employees/employee.controller.js";
import { EmployeeService } from "../../src/modules/employees/employee.service.js";
import {
    employeeCreateSchema,
    employeeListSchema,
} from "../../src/modules/employees/employee.schema.js";
import type { Request, Response } from "express";
import type { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";

const actor = { userId: "account", companyId: "company", role: "RECRUITER" } as const;
const input = employeeCreateSchema.parse({ email: "New@Example.com", password: "StrongPass123!" });
describe("employee management", () => {
    it("requires email, defaults to WORKER and excludes companyId from client input", () => {
        expect(input).toEqual({ email: "new@example.com", password: "StrongPass123!", role: "WORKER" });
        expect(employeeCreateSchema.safeParse({}).success).toBe(false);
        expect(employeeCreateSchema.safeParse({ ...input, companyId: "other" }).success).toBe(
            false,
        );
        expect(employeeListSchema.safeParse({ limit: 101 }).success).toBe(false);
    });
    it("rejects an owner role assigned by a recruiter", async () => {
        await expect(
            new EmployeeService().create(actor, { ...input, role: "OWNER" }),
        ).rejects.toThrow();
    });
    it("maps a unique email collision to a generic conflict", async () => {
        const repository = { create: vi.fn().mockRejectedValue({ code: "P2002" }) };
        await expect(
            new EmployeeService(repository as unknown as EmployeeRepository).create(actor, input),
        ).rejects.toThrow("Email is unavailable.");
    });
    it("returns the created employee ID for the profile redirect", async () => {
        const service = { create: vi.fn().mockResolvedValue({ id: "employee" }) };
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
        await new EmployeeController(service as unknown as EmployeeService).create(
            { user: actor, body: input } as Request,
            res as unknown as Response,
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ employee: { id: "employee" } }),
        );
    });
});
