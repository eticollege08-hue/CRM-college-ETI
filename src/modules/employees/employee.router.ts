import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { accessFor } from "#middlewares/access.middleware.js";

import { employeeController } from "./employee.controller.js";
import { employeeCreateSchema, employeeUpdateSchema } from "./employee.schema.js";

const router = Router();

router.get("/", asyncCatch(employeeController.getAll));

router.get("/:id", validateParams(uuidSchema), asyncCatch(employeeController.getById));

router.post(
    "/",
    accessFor(["OWNER", "RECRUITER"]),
    validateBody(employeeCreateSchema),
    asyncCatch(employeeController.create),
);

router.patch(
    "/:id",
    accessFor(["OWNER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    validateBody(employeeUpdateSchema),
    asyncCatch(employeeController.update),
);

router.delete(
    "/:id",
    accessFor(["OWNER", "HR"]),
    validateParams(uuidSchema),
    asyncCatch(employeeController.delete),
);

export default router;
