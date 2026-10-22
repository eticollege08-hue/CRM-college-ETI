import { PAGE_PATH, PAGE_DATA } from "./hierarchy-ssr.constants.js";
import { hierarchyPageService } from "./hierarchy-ssr.service.js";

import type { Request, Response } from "express";

export const hierarchyPageController = {
    async hierarchyTree(_req: Request, res: Response) {
        const payload = await hierarchyPageService.hierarchyTree();
        res.render(PAGE_PATH.HIERARCHY, { ...PAGE_DATA.HIERARCHY, ...payload });
    },
};
