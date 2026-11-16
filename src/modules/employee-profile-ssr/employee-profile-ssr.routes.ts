import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";

import { employeeProfilePageController } from "./employee-profile-ssr.controller.js";

const router = Router();

router.get(
    "/api/profile",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch(employeeProfilePageController.index),
);

export default router;
