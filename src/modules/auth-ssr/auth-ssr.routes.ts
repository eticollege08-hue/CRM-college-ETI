import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { authPageController } from "./auth-ssr.controller.js";

const router = Router();
router.get("/login", asyncCatch(authPageController.login));
router.get("/register", asyncCatch(authPageController.register));
export default router;
