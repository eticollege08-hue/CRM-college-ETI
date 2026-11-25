import { Router } from "express";

import { accessFor } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { estimateController } from "./estimate.controller.js";
import { estimateCreateSchema, estimateUpdateSchema } from "./estimate.schema.js";

const router = Router();

router.get(
    "/",
    accessFor(["OWNER", "MANAGER", "HR", "WORKER"]),
    asyncCatch(estimateController.getList),
);

router.get(
    "/:id",
    accessFor(["OWNER", "MANAGER", "HR", "WORKER"]),
    validateParams(uuidSchema),
    asyncCatch(estimateController.getById),
);

router.post(
    "/",
    accessFor(["OWNER", "MANAGER"]),
    validateBody(estimateCreateSchema),
    asyncCatch(estimateController.create),
);

router.patch(
    "/:id",
    accessFor(["OWNER", "MANAGER"]),
    validateParams(uuidSchema),
    validateBody(estimateUpdateSchema),
    asyncCatch(estimateController.update),
);

router.delete(
    "/:id",
    accessFor(["OWNER", "MANAGER"]),
    validateParams(uuidSchema),
    asyncCatch(estimateController.delete),
);

export default router;
