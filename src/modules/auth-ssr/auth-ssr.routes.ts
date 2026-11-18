import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { authPageController } from "./auth-ssr.controller.js";

const router = Router();
router.get("/login", asyncCatch(authPageController.login));
router.get("/home", isAuth, asyncCatch(authPageController.home));
router.get("/profile", isAuth, asyncCatch(authPageController.profile));
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
    "/projects",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch((req, res) => authPageController.comingSoon(req, res, "Projects", "projects")),
);
router.get(
    "/settings",
    isAuth,
    accessFor(ALL_ROLES),
    asyncCatch((req, res) => authPageController.comingSoon(req, res, "Settings", "settings")),
);
router.get("/design-preview", accessFor("PUBLIC"), asyncCatch(authPageController.home));
router.get("/registration-preview", accessFor("PUBLIC"), asyncCatch(authPageController.register));
export default router;
