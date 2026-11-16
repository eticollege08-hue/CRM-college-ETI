import { describe, expect, it, vi } from "vitest";

import { aboutUsPageController } from "../../src/modules/about-us-ssr/about-us-ssr.controller.js";
import { aboutUsPageService } from "../../src/modules/about-us-ssr/about-us-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/about-us-ssr/about-us-ssr.service.js", () => ({
    aboutUsPageService: { getPageData: vi.fn() },
}));

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const records = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "About",
        description: "Our story",
        companyId,
    },
];

describe("aboutUsPageController", () => {
    it("renders the About Us page with the signed-in company's records", async () => {
        const req = {
            user: { userId: "account", role: "WORKER", companyId, exp: 2000000000 },
        } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;
        vi.mocked(aboutUsPageService.getPageData).mockResolvedValueOnce({
            aboutUsRecords: records,
        });

        await aboutUsPageController.index(req, res);

        expect(aboutUsPageService.getPageData).toHaveBeenCalledWith(companyId);
        expect(res.render).toHaveBeenCalledWith("pages/about-us", {
            css: "about-us",
            js: "about-us",
            activePage: "about-us",
            aboutUsRecords: records,
        });
    });

    it("rejects with 401 when no authenticated account is present", async () => {
        const res = { render: vi.fn() } as unknown as Response;

        await expect(aboutUsPageController.index({} as Request, res)).rejects.toMatchObject({
            status: 401,
        });
        expect(res.render).not.toHaveBeenCalled();
    });
});
