import { beforeEach, describe, expect, it, vi } from "vitest";

import { employeesPageService } from "../../src/modules/employees-ssr/employees-ssr.service.js";

const { getById } = vi.hoisted(() => ({ getById: vi.fn() }));

vi.mock("#modules/employees/employee.service.js", () => ({
    employeeService: { getById },
}));

const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: employeeId,
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};

describe("employeesPageService profile data", () => {
    beforeEach(() => {
        getById.mockReset();
    });

    it("loads and returns the requested employee", async () => {
        getById.mockResolvedValue(employee);

        const result = await employeesPageService.getProfilePageData(employeeId);

        expect(getById).toHaveBeenCalledWith(employeeId);
        expect(result).toEqual({ employee });
    });

    it("forwards errors from the employee service", async () => {
        const error = new Error("Employee lookup failed");
        getById.mockRejectedValue(error);

        await expect(employeesPageService.getProfilePageData(employeeId)).rejects.toBe(error);
    });
});
