import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";

import { profileController } from "./profile.controller.js";
import { profileUpdateSchema } from "./profile.schema.js";

const router = Router();

router.patch(
    "/",
    checkAuthOrigin,
    validateBody(profileUpdateSchema),
    asyncCatch(profileController.updateOwnProfile),
);

export default router;
