import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { projectsController } from "./projects.controller.js";
import { projectCreateSchema, projectUpdateSchema } from "./projects.schema.js";

const router = Router();

router.get("/", asyncCatch(projectsController.getAll));
router.get("/:id", validateParams(uuidSchema), asyncCatch(projectsController.getById));
router.post("/", validateBody(projectCreateSchema), asyncCatch(projectsController.create));
router.patch(
    "/:id",
    validateParams(uuidSchema),
    validateBody(projectUpdateSchema),
    asyncCatch(projectsController.update),
);
router.delete("/:id", validateParams(uuidSchema), asyncCatch(projectsController.delete));

export default router;
