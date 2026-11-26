import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";
import { calendarQuerySchema } from "#modules/events/event.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { PAGE_PATH } from "./calendar-ssr.constants.js";
import { calendarPageService } from "./calendar-ssr.service.js";

import type { Request, Response } from "express";

export const calendarPageController = {
    async calendar(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const actor = getAuthUser(req);
        const query = calendarQuerySchema.parse(req.query);
        const [profileData, calendarData] = await Promise.all([
            authPageService.getProfilePageData(accountId),
            calendarPageService.getPageData(
                {
                    ...query,
                    timeZone: req.query.timeZone === undefined ? "Europe/Kiev" : query.timeZone,
                },
                actor,
            ),
        ]);
        const payload = {
            ...profileData,
            ...calendarData,
            css: "calendar",
            js: "calendar",
            activePage: "calendar",
            hideBrand: true,
        };
        res.setHeader("Cache-Control", "no-store");
        res.render(PAGE_PATH.CALENDAR, payload);
    },
};
