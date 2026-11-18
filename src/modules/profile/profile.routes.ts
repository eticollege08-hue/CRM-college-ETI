import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";

import { profileController } from "./profile.controller.js";
import { profileUpdateSchema } from "./profile.schema.js";

const router = Router();

router.patch(
    "/",
    checkAuthOrigin,
    accessFor(ALL_ROLES),
    validateBody(profileUpdateSchema),
    asyncCatch(profileController.updateOwnProfile),
);

export default router;
