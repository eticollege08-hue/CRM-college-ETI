import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { authPageController } from "./auth-ssr.controller.js";

const router = Router();
router.get("/login", accessFor("PUBLIC"), asyncCatch(authPageController.login));
router.get("/home", isAuth, accessFor(ALL_ROLES), asyncCatch(authPageController.home));
router.get("/profile", isAuth, accessFor(ALL_ROLES), asyncCatch(authPageController.profile));
router.get(
    "/documents",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch((req, res) => authPageController.comingSoon(req, res, "Documents", "documents")),
);
router.get(
    "/allowance",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch((req, res) => authPageController.comingSoon(req, res, "Allowance", "allowance")),
);
router.get(
    "/salary",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch((req, res) => authPageController.comingSoon(req, res, "Salary", "salary")),
);
router.get(
    "/settings",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch((req, res) => authPageController.comingSoon(req, res, "Settings", "settings")),
);
router.get("/design-preview", accessFor("PUBLIC"), asyncCatch(authPageController.home));
export default router;
