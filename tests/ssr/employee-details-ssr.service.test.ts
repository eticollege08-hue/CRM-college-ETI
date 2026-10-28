import { beforeEach, describe, expect, it, vi } from "vitest";

import { employeeDetailsPageService } from "../../src/modules/employee-details-ssr/employee-details-ssr.service.js";

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

describe("employeeDetailsPageService", () => {
    beforeEach(() => {
        getById.mockReset();
    });

    it("loads and returns the requested employee", async () => {
        getById.mockResolvedValue(employee);

        const result = await employeeDetailsPageService.getPageData(employeeId);

        expect(getById).toHaveBeenCalledWith(employeeId);
        expect(result).toEqual({ employee });
    });

    it("forwards errors from the employee service", async () => {
        const error = new Error("Employee lookup failed");
        getById.mockRejectedValue(error);

        await expect(employeeDetailsPageService.getPageData(employeeId)).rejects.toBe(error);
    });
});
