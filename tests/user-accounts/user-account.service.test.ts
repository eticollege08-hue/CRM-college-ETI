import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserAccountService } from "../../src/modules/user-accounts/user-account.service.js";

import type { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";
import type { UserAccountRepository } from "../../src/modules/user-accounts/user-account.repository.js";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: employeeId,
    companyId,
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};
const accountInput = {
    employeeId,
    email: "OLENA@example.com",
    passwordHash: "hashed-password",
    roleKey: "OWNER" as const,
};

describe("UserAccountService", () => {
    let repository: {
        create: ReturnType<typeof vi.fn>;
        getByEmail: ReturnType<typeof vi.fn>;
        createSeedAccount: ReturnType<typeof vi.fn>;
    };
    let employees: { getById: ReturnType<typeof vi.fn> };
    let service: UserAccountService;

    beforeEach(() => {
        repository = { create: vi.fn(), getByEmail: vi.fn(), createSeedAccount: vi.fn() };
        employees = { getById: vi.fn() };
        service = new UserAccountService(
            repository as unknown as UserAccountRepository,
            employees as unknown as EmployeeRepository,
        );
    });

    it("creates an account for an employee of the same company with a lowercase email", async () => {
        const account = { id: "account-id", ...accountInput, email: "olena@example.com" };
        employees.getById.mockResolvedValue(employee);
        repository.create.mockResolvedValue(account);

        const result = await service.create(accountInput, companyId);

        expect(employees.getById).toHaveBeenCalledWith(employeeId, companyId);
        expect(repository.create).toHaveBeenCalledWith(
            {
                ...accountInput,
                email: "olena@example.com",
            },
            companyId,
        );
        expect(result).toEqual(account);
    });

    it("rejects account creation when the employee does not exist in the company", async () => {
        employees.getById.mockResolvedValue(null);

        await expect(service.create(accountInput, companyId)).rejects.toMatchObject({
            status: 422,
            message: "Співробітника не знайдено",
        });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("forwards repository conflicts for duplicate account constraints", async () => {
        const conflict = new Error("Unique account constraint failed");
        employees.getById.mockResolvedValue(employee);
        repository.create.mockRejectedValue(conflict);

        await expect(service.create(accountInput, companyId)).rejects.toBe(conflict);
    });

    it("looks up an account using a lowercase email", async () => {
        const account = { id: "account-id", email: "olena@example.com" };
        repository.getByEmail.mockResolvedValue(account);

        const result = await service.getByEmail("OLENA@EXAMPLE.COM");

        expect(repository.getByEmail).toHaveBeenCalledWith("olena@example.com");
        expect(result).toEqual(account);
    });

    it("returns null when no account exists for the email", async () => {
        repository.getByEmail.mockResolvedValue(null);

        const result = await service.getByEmail("missing@example.com");

        expect(result).toBeNull();
    });

    it.each(["OWNER", "MANAGER", "RECRUITER", "HR", "WORKER"] as const)(
        "creates a seed account using the supplied %s role, company and normalized email",
        async (roleKey) => {
            const data = { email: " EXAMPLE@example.com ", passwordHash: "bcrypt-hash", roleKey };
            const account = { id: "seed-account-id", ...data, email: "example@example.com" };
            repository.createSeedAccount.mockResolvedValue(account);

            const result = await service.createSeedAccount(
                data,
                "Mock Employee",
                "Default company",
            );

            expect(repository.createSeedAccount).toHaveBeenCalledWith(
                { ...data, email: "example@example.com" },
                "Mock Employee",
                "Default company",
            );
            expect(result).toEqual(account);
        },
    );
});
