import { describe, expect, it, vi } from "vitest";

import { authPageController } from "../../src/modules/auth-ssr/auth-ssr.controller.js";
import { authPageService } from "../../src/modules/auth-ssr/auth-ssr.service.js";

import type { Request, Response } from "express";

vi.mock("../../src/modules/auth-ssr/auth-ssr.service.js", () => ({
    authPageService: { getHomePageData: vi.fn() },
}));

describe("authPageController home page", () => {
    it("renders the home template with the authenticated user's page data", async () => {
        const payload = {
            css: "home",
            js: "",
            activePage: "home",
            hideBrand: true,
            todayEvents: [],
        };
        vi.mocked(authPageService.getHomePageData).mockResolvedValue(payload);
        const req = { user: { userId: "account-id" } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await authPageController.home(req, res);

        expect(authPageService.getHomePageData).toHaveBeenCalledExactlyOnceWith("account-id");
        expect(res.render).toHaveBeenCalledExactlyOnceWith("pages/home", payload);
    });
});
