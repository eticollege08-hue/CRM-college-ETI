import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";

import { PAGE_PATH } from "./calendar-ssr.constants.js";

import type { Request, Response } from "express";

export const calendarPageController = {
    async calendar(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const payload = await authPageService.getComingSoonPageData(
            accountId,
            "Calendar",
            "calendar",
        );
        res.setHeader("Cache-Control", "no-store");
        res.render(PAGE_PATH.CALENDAR, payload);
    },
};
