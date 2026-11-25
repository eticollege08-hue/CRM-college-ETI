import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { projectsPageController } from "./projects-ssr.controller.js";

const router = Router();

router.get("/projects", isAuth, accessFor(ALL_ROLES), asyncCatch(projectsPageController.index));
router.get(
    "/projects/create",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch(projectsPageController.createPage),
);
router.get(
    "/projects/:id",
    isAuth,
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(projectsPageController.details),
);

export default router;
