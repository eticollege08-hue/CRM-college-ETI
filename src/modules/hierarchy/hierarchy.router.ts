import { Router } from "express";

import { accessFor } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { hierarchyController } from "./hierarchy.controller.js";
import { hierarchyCreateSchema, hierarchyUpdateSchema } from "./hierarchy.schema.js";

const router = Router();

router.get("/", asyncCatch(hierarchyController.getAll));

router.get("/:id", validateParams(uuidSchema), asyncCatch(hierarchyController.getById));

router.post(
    "/",
    checkAuthOrigin,
    accessFor(["OWNER", "RECRUITER", "HR", "MANAGER"]),
    validateBody(hierarchyCreateSchema),
    asyncCatch(hierarchyController.create),
);

router.patch(
    "/:id",
    checkAuthOrigin,
    accessFor(["OWNER", "RECRUITER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    validateBody(hierarchyUpdateSchema),
    asyncCatch(hierarchyController.update),
);

router.delete(
    "/:id",
    checkAuthOrigin,
    accessFor(["OWNER", "RECRUITER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    asyncCatch(hierarchyController.delete),
);

export default router;
