import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { projectsPageController } from "./projects-ssr.controller.js";

const router = Router();

router.get("/projects", isAuth, asyncCatch(projectsPageController.index));
router.get("/projects/create", isAuth, asyncCatch(projectsPageController.createPage));
router.get(
    "/projects/:id",
    isAuth,
    validateParams(uuidSchema),
    asyncCatch(projectsPageController.details),
);

export default router;
