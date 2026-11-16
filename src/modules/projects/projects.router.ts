import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { projectsController } from "./projects.controller.js";
import { projectCreateSchema, projectUpdateSchema } from "./projects.schema.js";

const router = Router();

router.get("/", accessFor(ALL_ROLES), asyncCatch(projectsController.getAll));
router.get(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(projectsController.getById),
);
router.post(
    "/",
    accessFor(ALL_ROLES),
    validateBody(projectCreateSchema),
    asyncCatch(projectsController.create),
);
router.patch(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    validateBody(projectUpdateSchema),
    asyncCatch(projectsController.update),
);
router.delete(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(projectsController.delete),
);

export default router;
