import { beforeEach, describe, expect, it, vi } from "vitest";

import { employeesPageService } from "../../src/modules/employees-ssr/employees-ssr.service.js";

const { mockGetAll } = vi.hoisted(() => ({ mockGetAll: vi.fn() }));

vi.mock("#modules/employees/employee.service.js", () => ({
    employeeService: { getAll: mockGetAll },
}));

const employees = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        fullName: "Olena Kovalenko",
        imageId: null,
        level: null,
        position: "HR",
    },
];

describe("employeesPageService", () => {
    beforeEach(() => {
        mockGetAll.mockReset();
    });

    it("returns employee data for the page", async () => {
        mockGetAll.mockResolvedValue(employees);

        const result = await employeesPageService.getPageData();

        expect(mockGetAll).toHaveBeenCalledOnce();
        expect(result).toEqual({ employees });
    });

    it("forwards errors from the employee service", async () => {
        const error = new Error("Employee lookup failed");
        mockGetAll.mockRejectedValue(error);

        await expect(employeesPageService.getPageData()).rejects.toBe(error);
    });
});
