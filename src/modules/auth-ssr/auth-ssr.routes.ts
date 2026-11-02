import { Router } from "express";

import { isAuth } from "#middlewares/auth.middleware.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { authPageController } from "./auth-ssr.controller.js";

const router = Router();
router.get("/login", asyncCatch(authPageController.login));
router.get("/dashboard", isAuth, asyncCatch(authPageController.home));
router.get("/profile", isAuth, asyncCatch(authPageController.profile));
router.get("/documents", isAuth, asyncCatch((req, res) => authPageController.comingSoon(req, res, "Documents", "documents")));
router.get("/allowance", isAuth, asyncCatch((req, res) => authPageController.comingSoon(req, res, "Allowance", "allowance")));
router.get("/salary", isAuth, asyncCatch((req, res) => authPageController.comingSoon(req, res, "Salary", "salary")));
router.get("/projects", isAuth, asyncCatch((req, res) => authPageController.comingSoon(req, res, "Projects", "projects")));
router.get("/settings", isAuth, asyncCatch((req, res) => authPageController.comingSoon(req, res, "Settings", "settings")));
router.get("/design-preview", asyncCatch(authPageController.home));
router.get("/registration-preview", asyncCatch(authPageController.register));
export default router;
