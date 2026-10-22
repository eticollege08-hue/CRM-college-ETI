import { Router } from "express";

import { accessFor } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { hierarchyController } from "./hierarchy.controller.js";
import { hierarchyCreateSchema, hierarchyUpdateSchema } from "./hierarchy.schema.js";

const router = Router();

router.get("/", asyncCatch(hierarchyController.getAll));

router.get("/:id", validateParams(uuidSchema), asyncCatch(hierarchyController.getById));

router.post(
    "/",
    accessFor(["OWNER", "RECRUITER", "HR", "MANAGER"]),
    validateBody(hierarchyCreateSchema),
    asyncCatch(hierarchyController.create),
);

router.patch(
    "/:id",
    accessFor(["OWNER", "RECRUITER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    validateBody(hierarchyUpdateSchema),
    asyncCatch(hierarchyController.update),
);

router.delete(
    "/:id",
    accessFor(["OWNER", "RECRUITER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    asyncCatch(hierarchyController.delete),
);

export default router;
