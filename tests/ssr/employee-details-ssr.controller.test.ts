import { describe, expect, it, vi } from "vitest";

import { employeeDetailsPageController } from "../../src/modules/employee-details-ssr/employee-details-ssr.controller.js";
import { employeeDetailsPageService } from "../../src/modules/employee-details-ssr/employee-details-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/employee-details-ssr/employee-details-ssr.service.js", () => ({
    employeeDetailsPageService: { getPageData: vi.fn() },
}));

const employeeId = "550e8400-e29b-41d4-a716-446655440000";
const employee = {
    id: employeeId,
    fullName: "Olena Kovalenko",
    imageId: null,
    level: null,
    position: "HR",
};

describe("employeeDetailsPageController", () => {
    it("renders the requested employee profile", async () => {
        const req = { params: { id: employeeId } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;
        vi.mocked(employeeDetailsPageService.getPageData).mockResolvedValueOnce({ employee });

        await employeeDetailsPageController.index(req, res);

        expect(employeeDetailsPageService.getPageData).toHaveBeenCalledWith(employeeId);
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

        await expect(employeeDetailsPageController.index(req, res)).rejects.toBeDefined();
        expect(employeeDetailsPageService.getPageData).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
