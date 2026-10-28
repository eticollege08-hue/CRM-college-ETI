import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { employeeDetailsPageController } from "./employee-details-ssr.controller.js";

const router = Router();

router.get(
    "/employees/:id/profile",
    validateParams(uuidSchema),
    asyncCatch(employeeDetailsPageController.index),
);

export default router;
