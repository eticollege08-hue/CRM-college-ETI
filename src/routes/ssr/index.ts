import express from "express";

import authPageRoutes from "#modules/auth-ssr/auth-ssr.routes.js";
import employeesPageRoutes from "#modules/employees-ssr/employees-ssr.routes.js";
import hierarchyPageRoutes from "#modules/hierarchy-ssr/hierarchy-ssr.routes.js";
import calendarPageRoutes from "#modules/calendar-ssr/calendar-ssr.routes.js";
import projectsPageRoutes from "#modules/projects-ssr/projects-ssr.routes.js";

const router = express.Router();

router.use("/", employeesPageRoutes);
router.use("/", authPageRoutes);
router.use("/", hierarchyPageRoutes);
router.use("/", calendarPageRoutes);
router.use("/", projectsPageRoutes);

export default router;
