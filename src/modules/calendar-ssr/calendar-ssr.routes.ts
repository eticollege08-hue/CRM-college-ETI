import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";

import { calendarPageController } from "./calendar-ssr.controller.js";

const router = Router();
router.get("/calendar", isAuth, asyncCatch(calendarPageController.calendar));
export default router;
