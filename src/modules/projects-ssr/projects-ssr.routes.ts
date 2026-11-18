import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";

import { projectsPageController } from "./projects-ssr.controller.js";

const router = Router();

router.get("/projects", isAuth, accessFor(ALL_ROLES), asyncCatch(projectsPageController.index));

export default router;
