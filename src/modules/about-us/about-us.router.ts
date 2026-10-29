import { Router } from "express";

import { accessFor } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { aboutUsController } from "./about-us.controller.js";
import { aboutUsCreateSchema, aboutUsUpdateSchema } from "./about-us.schema.js";

const router = Router();

router.get("/", asyncCatch(aboutUsController.getAll));
router.get("/:id", validateParams(uuidSchema), asyncCatch(aboutUsController.getById));

router.post(
    "/",
    accessFor(["OWNER"]),
    validateBody(aboutUsCreateSchema),
    asyncCatch(aboutUsController.create),
);

router.patch(
    "/:id",
    accessFor(["OWNER"]),
    validateParams(uuidSchema),
    validateBody(aboutUsUpdateSchema),
    asyncCatch(aboutUsController.update),
);

router.delete(
    "/:id",
    accessFor(["OWNER"]),
    validateParams(uuidSchema),
    asyncCatch(aboutUsController.delete),
);

export default router;
