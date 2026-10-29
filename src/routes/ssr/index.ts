import express from "express";

import authPageRoutes from "#modules/auth-ssr/auth-ssr.routes.js";
import aboutUsPageRoutes from "#modules/about-us-ssr/about-us-ssr.routes.js";
import employeesPageRoutes from "#modules/employees-ssr/employees-ssr.routes.js";
import hierarchyPageRoutes from "#modules/hierarchy-ssr/hierarchy-ssr.routes.js";

const router = express.Router();

router.use("/", employeesPageRoutes);
router.use("/", aboutUsPageRoutes);
router.use("/", authPageRoutes);
router.use("/", hierarchyPageRoutes);

export default router;
