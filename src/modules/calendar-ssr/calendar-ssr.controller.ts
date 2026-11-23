import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";
import { calendarQuerySchema } from "#modules/events/event.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { PAGE_DATA, PAGE_PATH } from "./calendar-ssr.constants.js";
import { calendarPageService } from "./calendar-ssr.service.js";

import type { Request, Response } from "express";

export const calendarPageController = {
    async calendar(req: Request, res: Response) {
        const actor = getAuthUser(req);
        const query = calendarQuerySchema.parse(req.query);
        const [payload, profileData] = await Promise.all([
            calendarPageService.getPageData(query, actor),
            authPageService.getProfilePageData(actor.userId),
        ]);
        res.setHeader("Cache-Control", "no-store");
        res.render(PAGE_PATH.CALENDAR, { ...profileData, ...PAGE_DATA.CALENDAR, ...payload });
    },
};
