import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";

import { projectsPageController } from "./projects-ssr.controller.js";

const router = Router();

router.get("/projects", isAuth, asyncCatch(projectsPageController.index));

export default router;
