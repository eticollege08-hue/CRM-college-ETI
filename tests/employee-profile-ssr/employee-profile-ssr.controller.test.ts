import { describe, expect, it, vi } from "vitest";

import { employeeProfilePageController } from "../../src/modules/employee-profile-ssr/employee-profile-ssr.controller.js";
import { employeeProfilePageService } from "../../src/modules/employee-profile-ssr/employee-profile-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/employee-profile-ssr/employee-profile-ssr.service.js", () => ({
    employeeProfilePageService: { getPageData: vi.fn() },
}));

const accountId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};

describe("employeeProfilePageController", () => {
    it("renders only the profile resolved for the authenticated account", async () => {
        const req = { user: { userId: accountId } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;
        vi.mocked(employeeProfilePageService.getPageData).mockResolvedValueOnce({ employee });

        await employeeProfilePageController.index(req, res);

        expect(employeeProfilePageService.getPageData).toHaveBeenCalledWith(accountId);
        expect(res.render).toHaveBeenCalledWith("pages/profile", {
            css: "profile",
            js: "profile",
            activePage: "profile",
            employee,
        });
    });

    it("rejects requests without authenticated account data", async () => {
        const req = {} as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await expect(employeeProfilePageController.index(req, res)).rejects.toMatchObject({
            status: 401,
        });
        expect(employeeProfilePageService.getPageData).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
