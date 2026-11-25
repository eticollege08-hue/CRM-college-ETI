import { Router, raw } from "express";

import { ALL_ROLES, accessFor } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { employeeController } from "./employee.controller.js";
import {
    employeeCreateSchema,
    employeeSalaryUpdateSchema,
    employeeUpdateSchema,
} from "./employee.schema.js";

const router = Router();

router.get("/", accessFor(ALL_ROLES), asyncCatch(employeeController.list));
router.get(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(employeeController.get),
);
router.post(
    "/",
    accessFor(["OWNER", "RECRUITER"]),
    checkAuthOrigin,
    validateBody(employeeCreateSchema),
    asyncCatch(employeeController.create),
);
router.delete(
    "/:id",
    accessFor(["OWNER", "HR"]),
    checkAuthOrigin,
    validateParams(uuidSchema),
    asyncCatch(employeeController.dismiss),
);
router.get(
    "/:id/photo",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(employeeController.photo),
);
router.put(
    "/:id/photo",
    accessFor(ALL_ROLES),
    checkAuthOrigin,
    validateParams(uuidSchema),
    raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }),
    asyncCatch(employeeController.upload),
);

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
