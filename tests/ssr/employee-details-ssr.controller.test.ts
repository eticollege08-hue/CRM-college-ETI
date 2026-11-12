import { describe, expect, it, vi } from "vitest";

import { employeesPageController } from "../../src/modules/employees-ssr/employees-ssr.controller.js";
import { employeesPageService } from "../../src/modules/employees-ssr/employees-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/employees-ssr/employees-ssr.service.js", () => ({
    employeesPageService: { getProfilePageData: vi.fn() },
}));

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const user = { userId: "account", role: "WORKER", companyId, exp: 2000000000 };
const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: employeeId,
    companyId,
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
    phoneNumber: null,
    slack: null,
    telegram: null,
    viber: null,
    whatsapp: null,
    discord: null,
};

describe("employeesPageController profile", () => {
    it("renders the requested employee profile from the signed-in company", async () => {
        const req = { params: { id: employeeId }, user } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;
        vi.mocked(employeesPageService.getProfilePageData).mockResolvedValueOnce({ employee });

        await employeesPageController.profile(req, res);

        expect(employeesPageService.getProfilePageData).toHaveBeenCalledWith(employeeId, companyId);
        expect(res.render).toHaveBeenCalledWith("pages/employee-details", {
            css: "employee-details",
            js: "employee-details",
            activePage: "employees",
            employee,
        });
    });

    it("rejects malformed employee IDs", async () => {
        const req = { params: { id: "invalid-id" }, user } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await expect(employeesPageController.profile(req, res)).rejects.toBeDefined();
        expect(employeesPageService.getProfilePageData).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
