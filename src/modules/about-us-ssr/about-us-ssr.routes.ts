import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { aboutUsPageController } from "./about-us-ssr.controller.js";

const router = Router();

router.get("/about-us", isAuth, asyncCatch(aboutUsPageController.index));

export default router;
