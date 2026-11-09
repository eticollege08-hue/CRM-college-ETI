import { describe, expect, it, vi } from "vitest";

import { isAuth } from "../../src/middlewares/auth.middleware.js";
import { authPageController } from "../../src/modules/auth-ssr/auth-ssr.controller.js";
import router from "../../src/modules/auth-ssr/auth-ssr.routes.js";

import type { NextFunction, Request, RequestHandler, Response } from "express";

vi.mock("../../src/middlewares/auth.middleware.js", () => ({ isAuth: vi.fn() }));
vi.mock("../../src/modules/auth-ssr/auth-ssr.controller.js", () => ({
    authPageController: {
        login: vi.fn(),
        home: vi.fn(),
        register: vi.fn(),
        profile: vi.fn(),
        comingSoon: vi.fn(),
    },
}));

describe("auth SSR routes", () => {
    it("serves the protected /home route as the coming-soon placeholder", async () => {
        vi.mocked(authPageController.comingSoon).mockResolvedValue(undefined);
        const layer = router.stack.find((entry) => entry.route?.path === "/home");
        const handlers = (layer?.route?.stack ?? []).map((entry) => entry.handle as RequestHandler);
        const req = {} as Request;
        const res = {} as Response;
        const next = vi.fn() as NextFunction;

        await handlers[1]?.(req, res, next);

        expect(handlers).toHaveLength(2);
        expect(handlers[0]).toBe(isAuth);
        expect(authPageController.comingSoon).toHaveBeenCalledExactlyOnceWith(
            req,
            res,
            "Home",
            "home",
        );
        expect(authPageController.home).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });
});
