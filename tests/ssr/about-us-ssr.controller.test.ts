import { describe, expect, it, vi } from "vitest";

import { aboutUsPageController } from "../../src/modules/about-us-ssr/about-us-ssr.controller.js";
import { aboutUsPageService } from "../../src/modules/about-us-ssr/about-us-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/about-us-ssr/about-us-ssr.service.js", () => ({
    aboutUsPageService: { getPageData: vi.fn() },
}));

const records = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "About",
        description: "Our story",
    },
];

describe("aboutUsPageController", () => {
    it("renders the About Us page with its records", async () => {
        const req = {} as Request;
        const res = { render: vi.fn() } as unknown as Response;
        vi.mocked(aboutUsPageService.getPageData).mockResolvedValueOnce({
            aboutUsRecords: records,
        });

        await aboutUsPageController.index(req, res);

        expect(res.render).toHaveBeenCalledWith("pages/about-us", {
            css: "about-us",
            js: "about-us",
            activePage: "about-us",
            aboutUsRecords: records,
        });
    });
});
