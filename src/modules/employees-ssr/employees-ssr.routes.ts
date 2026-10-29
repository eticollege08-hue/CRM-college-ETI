import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { employeesPageController } from "./employees-ssr.controller.js";

const router = Router();

router.get("/employees", asyncCatch(employeesPageController.index));
router.get(
    "/employees/:id/profile",
    validateParams(uuidSchema),
    asyncCatch(employeesPageController.profile),
);

export default router;
