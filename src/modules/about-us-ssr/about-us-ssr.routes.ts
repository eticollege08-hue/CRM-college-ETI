import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { aboutUsPageController } from "./about-us-ssr.controller.js";

const router = Router();

router.get("/about-us", asyncCatch(aboutUsPageController.index));

export default router;
