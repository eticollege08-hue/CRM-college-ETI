import express from "express";

import authPageRoutes from "#modules/auth-ssr/auth-ssr.routes.js";
import employeeDetailsPageRoutes from "#modules/employee-details-ssr/employee-details-ssr.routes.js";
import employeesPageRoutes from "#modules/employees-ssr/employees-ssr.routes.js";
import hierarchyPageRoutes from "#modules/hierarchy-ssr/hierarchy-ssr.routes.js";

const router = express.Router();

router.use("/", employeesPageRoutes);
router.use("/", employeeDetailsPageRoutes);
router.use("/", authPageRoutes);
router.use("/", hierarchyPageRoutes);

export default router;
