import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";

import { aboutUsPageController } from "./about-us-ssr.controller.js";

const router = Router();

// About Us records belong to a company, so the page needs the signed-in account's tenant.
router.get("/about-us", isAuth, asyncCatch(aboutUsPageController.index));

export default router;
