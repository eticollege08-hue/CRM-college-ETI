import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { validateBody, validateParams } from "#middlewares/validate.middleware.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { eventController } from "./event.controller.js";
import {
    eventCreateSchema,
    eventUpdateSchema,
    eventDeleteSchema,
    eventParticipantsSchema,
    eventParticipantParamsSchema,
} from "./event.schema.js";

const router = Router();
router.get("/", accessFor(ALL_ROLES), asyncCatch(eventController.getAll));
router.get(
    "/:id",
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(eventController.getById),
);
router.post(
    "/",
    checkAuthOrigin,
    accessFor(ALL_ROLES),
    validateBody(eventCreateSchema),
    asyncCatch(eventController.create),
);
router.patch(
    "/:id",
    checkAuthOrigin,
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    validateBody(eventUpdateSchema),
    asyncCatch(eventController.update),
);
router.delete(
    "/:id",
    checkAuthOrigin,
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    validateBody(eventDeleteSchema),
    asyncCatch(eventController.delete),
);
router.post(
    "/:id/participants",
    checkAuthOrigin,
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    validateBody(eventParticipantsSchema),
    asyncCatch(eventController.addParticipants),
);
router.delete(
    "/:id/participants/:employeeId",
    checkAuthOrigin,
    accessFor(ALL_ROLES),
    validateParams(eventParticipantParamsSchema),
    asyncCatch(eventController.removeParticipant),
);
export default router;
