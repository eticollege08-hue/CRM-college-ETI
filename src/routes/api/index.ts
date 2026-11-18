import express from "express";

import authRoutes from "#modules/auth/auth.routes.js";
import aboutUsRouter from "#modules/about-us/about-us.router.js";
import docsRouter from "#modules/docs/docs.router.js";
import eventRouter from "#modules/events/event.router.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor, ALL_ROLES } from "#middlewares/access.middleware.js";
import hierarchyRouter from "#modules/hierarchy/hierarchy.router.js";
import employeeRouter from "#modules/employees/employee.routes.js";
import profileRouter from "#modules/profile/profile.routes.js";
import projectsRouter from "#modules/projects/projects.router.js";
import estimateRouter from "#modules/estimates/estimate.router.js";

const router = express.Router();

router.use("/docs", accessFor("PUBLIC"), docsRouter);
router.use("/auth", authRoutes);
router.use("/events", isAuth, accessFor(ALL_ROLES), eventRouter);
router.use("/about-us", isAuth, accessFor(ALL_ROLES), aboutUsRouter);
router.use("/employees", isAuth, accessFor(ALL_ROLES), employeeRouter);
router.use("/hierarchy", isAuth, accessFor(ALL_ROLES), hierarchyRouter);
router.use("/profile", isAuth, accessFor(ALL_ROLES), profileRouter);
router.use("/projects", isAuth, accessFor(ALL_ROLES), projectsRouter);
router.use("/estimates", isAuth, accessFor(ALL_ROLES), estimateRouter);

export default router;
