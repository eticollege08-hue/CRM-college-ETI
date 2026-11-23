import { Router } from "express";

import { accessFor } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { employeeController } from "./employee.controller.js";
import { employeeSalaryUpdateSchema, employeeUpdateSchema } from "./employee.schema.js";

const router = Router();

router.patch(
    "/:id/salary",
    checkAuthOrigin,
    accessFor(["OWNER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    validateBody(employeeSalaryUpdateSchema),
    asyncCatch(employeeController.updateSalary),
);

router.patch(
    "/:id",
    checkAuthOrigin,
    accessFor(["OWNER", "HR", "MANAGER"]),
    validateParams(uuidSchema),
    validateBody(employeeUpdateSchema),
    asyncCatch(employeeController.update),
);

export default router;
