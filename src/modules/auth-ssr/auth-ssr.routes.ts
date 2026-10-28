import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { authPageController } from "./auth-ssr.controller.js";

const router = Router();
router.get("/login", asyncCatch(authPageController.login));
router.get("/dashboard", isAuth, asyncCatch(authPageController.home));
router.get("/design-preview", asyncCatch(authPageController.home));
router.get("/registration-preview", asyncCatch(authPageController.register));
export default router;
