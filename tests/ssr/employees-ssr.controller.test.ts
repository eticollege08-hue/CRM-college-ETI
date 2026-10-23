import { describe, expect, it, vi } from "vitest";

import { employeesPageController } from "../../src/modules/employees-ssr/employees-ssr.controller.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/employees-ssr/employees-ssr.service.js", () => ({
    employeesPageService: { getPageData: vi.fn() },
}));

describe("employeesPageController.add", () => {
    it("renders the add employee page without loading data", () => {
        const req = {} as Request;
        const res = { render: vi.fn() } as unknown as Response;

        employeesPageController.add(req, res);

        expect(res.render).toHaveBeenCalledWith("pages/employee-create", {
            css: "employee-create",
            js: "employee-create",
            activePage: "employees",
        });
    });
});
