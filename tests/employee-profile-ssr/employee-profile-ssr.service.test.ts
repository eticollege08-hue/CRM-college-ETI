import { beforeEach, describe, expect, it, vi } from "vitest";

import { employeeProfilePageService } from "../../src/modules/employee-profile-ssr/employee-profile-ssr.service.js";
import { ApiError } from "../../src/utils/error.util.js";

const { mockGetEmployeeByAccountId } = vi.hoisted(() => ({
    mockGetEmployeeByAccountId: vi.fn(),
}));

vi.mock("#modules/user-accounts/user-account.service.js", () => ({
    userAccountService: { getEmployeeByAccountId: mockGetEmployeeByAccountId },
}));

const accountId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    fullName: "Olena Kovalenko",
    imageId: null,
    level: "Senior",
    position: "HR",
};

describe("employeeProfilePageService", () => {
    beforeEach(() => {
        mockGetEmployeeByAccountId.mockReset();
    });

    it("returns the employee linked to the authenticated account", async () => {
        mockGetEmployeeByAccountId.mockResolvedValue(employee);

        const result = await employeeProfilePageService.getPageData(accountId);

        expect(mockGetEmployeeByAccountId).toHaveBeenCalledOnce();
        expect(mockGetEmployeeByAccountId).toHaveBeenCalledWith(accountId);
        expect(result).toEqual({ employee });
    });

    it("returns not found when the account has no employee profile", async () => {
        mockGetEmployeeByAccountId.mockResolvedValue(null);
        const result = employeeProfilePageService.getPageData(accountId);

        await expect(result).rejects.toBeInstanceOf(ApiError);
        await expect(result).rejects.toMatchObject({
            status: 404,
            message: "Employee profile not found",
        });
    });

    it("forwards database lookup failures", async () => {
        const error = new Error("Database unavailable");
        mockGetEmployeeByAccountId.mockRejectedValue(error);

        await expect(employeeProfilePageService.getPageData(accountId)).rejects.toBe(error);
    });
});
