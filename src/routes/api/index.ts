import express from "express";

import authRoutes from "#modules/auth/auth.routes.js";
import aboutUsRouter from "#modules/about-us/about-us.router.js";
import docsRouter from "#modules/docs/docs.router.js";
import eventRouter from "#modules/events/event.router.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import hierarchyRouter from "#modules/hierarchy/hierarchy.router.js";
import employeeRouter from "#modules/employees/employee.routes.js";
import profileRouter from "#modules/profile/profile.routes.js";
import projectsRouter from "#modules/projects/projects.router.js";
import estimateRouter from "#modules/estimates/estimate.router.js";

const router = express.Router();

router.use("/docs", docsRouter);
router.use("/auth", authRoutes);
router.use("/events", isAuth, eventRouter);
router.use("/about-us", isAuth, aboutUsRouter);
router.use("/employees", isAuth, employeeRouter);
router.use("/hierarchy", isAuth, hierarchyRouter);
router.use("/profile", isAuth, profileRouter);
router.use("/projects", isAuth, projectsRouter);
router.use("/estimates", isAuth, estimateRouter);

export default router;
