import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { projectsPageController } from "./projects-ssr.controller.js";

const router = Router();

router.get("/projects", asyncCatch(projectsPageController.index));

export default router;
