import { Router } from "express";

import { HttpStatus } from "#constants/http-status.constants.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { ApiError } from "#utils/error.util.js";

import { PROJECT_MESSAGES } from "./projects.constants.js";
import { projectsController } from "./projects.controller.js";
import {
    projectCreateSchema,
    projectDeleteSchema,
    projectUpdateSchema,
} from "./projects.schema.js";

import type { RequestHandler } from "express";

const router = Router();

const validateDeleteProject: RequestHandler = (req, _res, next) => {
    const body: unknown = req.body;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return next(
            new ApiError(HttpStatus.BAD_REQUEST, PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED, [
                { field: "confirmName", message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED },
            ]),
        );
    }
    const result = projectDeleteSchema.safeParse(body);
    if (!result.success) {
        return next(
            new ApiError(HttpStatus.BAD_REQUEST, PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED, [
                { field: "confirmName", message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED },
            ]),
        );
    }
    req.body = result.data;
    next();
};

router.get("/", accessFor(ALL_ROLES), asyncCatch(projectsController.getAll));
router.get(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(projectsController.getById),
);
router.post(
    "/",
    accessFor(ALL_ROLES),
    validateBody(projectCreateSchema),
    asyncCatch(projectsController.create),
);
router.patch(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    validateBody(projectUpdateSchema),
    asyncCatch(projectsController.update),
);
router.delete(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    validateDeleteProject,
    asyncCatch(projectsController.delete),
);

export default router;
