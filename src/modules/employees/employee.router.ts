import { Router } from "express";
import { ApiError } from "#utils/error.util.js";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeController } from "./employee.controller.js";
import { employeeCreateSchema, employeeUpdateSchema } from "./employee.schema.js";

const router = Router();

router.use((_req, _res, next) => {
    if (process.env.NODE_ENV !== "development") {
        return next(new ApiError(HttpStatus.FORBIDDEN, EMPLOYEE_MESSAGES.DEVELOPMENT_ONLY));
    }
    next();
});

router.get("/", asyncCatch(employeeController.getAll));
router.get("/:id", validateParams(uuidSchema), asyncCatch(employeeController.getById));
router.post("/", validateBody(employeeCreateSchema), asyncCatch(employeeController.create));
router.patch(
    "/:id",
    validateParams(uuidSchema),
    validateBody(employeeUpdateSchema),
    asyncCatch(employeeController.update),
);
router.delete("/:id", validateParams(uuidSchema), asyncCatch(employeeController.delete));

export default router;
