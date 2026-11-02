import { describe, expect, it, vi } from "vitest";

import { employeesPageController } from "../../src/modules/employees-ssr/employees-ssr.controller.js";
import { employeesPageService } from "../../src/modules/employees-ssr/employees-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/employees-ssr/employees-ssr.service.js", () => ({
    employeesPageService: { getProfilePageData: vi.fn() },
}));

const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: employeeId,
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};

describe("employeesPageController profile", () => {
    it("renders the requested employee profile", async () => {
        const req = { params: { id: employeeId } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;
        vi.mocked(employeesPageService.getProfilePageData).mockResolvedValueOnce({ employee });

        await employeesPageController.profile(req, res);

        expect(employeesPageService.getProfilePageData).toHaveBeenCalledWith(employeeId);
        expect(res.render).toHaveBeenCalledWith("pages/employee-details", {
            css: "employee-details",
            js: "employee-details",
            activePage: "employees",
            employee,
        });
    });

    it("rejects malformed employee IDs", async () => {
        const req = { params: { id: "invalid-id" } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await expect(employeesPageController.profile(req, res)).rejects.toBeDefined();
        expect(employeesPageService.getProfilePageData).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
