import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";

import { hierarchyPageController } from "./hierarchy-ssr.controller.js";

const router = Router();

router.get("/hierarchy", isAuth, asyncCatch(hierarchyPageController.hierarchyTree));

export default router;
