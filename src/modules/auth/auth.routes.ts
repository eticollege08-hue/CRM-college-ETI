import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { checkAuthOrigin } from "#middlewares/auth-origin.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";
import { authLoginSchema } from "#schemas/auth.schema.js";

import { authController } from "./auth.controller.js";

const router = Router();
router.post(
    "/login",
    checkAuthOrigin,
    validateBody(authLoginSchema),
    asyncCatch(authController.login),
);
router.post("/logout", checkAuthOrigin, isAuth, asyncCatch(authController.logout));
export default router;
