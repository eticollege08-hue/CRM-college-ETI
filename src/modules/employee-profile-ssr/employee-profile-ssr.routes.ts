import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";

import { employeeProfilePageController } from "./employee-profile-ssr.controller.js";

const router = Router();

router.get("/api/profile", isAuth, asyncCatch(employeeProfilePageController.index));

export default router;
