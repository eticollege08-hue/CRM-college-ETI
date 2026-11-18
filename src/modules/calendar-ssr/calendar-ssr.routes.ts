import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";

import { calendarPageController } from "./calendar-ssr.controller.js";

const router = Router();
router.get("/calendar", isAuth, accessFor(ALL_ROLES), asyncCatch(calendarPageController.calendar));
export default router;
