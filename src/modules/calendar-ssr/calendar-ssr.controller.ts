import { calendarQuerySchema } from "#modules/events/event.schema.js";

import { PAGE_PATH, PAGE_DATA } from "./calendar-ssr.constants.js";
import { calendarPageService } from "./calendar-ssr.service.js";

import type { Request, Response } from "express";

export const calendarPageController = {
    async calendar(req: Request, res: Response) {
        const query = calendarQuerySchema.parse(req.query);
        const payload = await calendarPageService.getPageData(query);
        res.setHeader("Cache-Control", "no-store");
        res.render(PAGE_PATH.CALENDAR, { ...PAGE_DATA.CALENDAR, ...payload });
    },
};
