import express from "express";

import employeesPageRoutes from "#modules/employees-ssr/employees-ssr.routes.js";
import employeeProfilePageRoutes from "#modules/employee-profile-ssr/employee-profile-ssr.routes.js";

const router = express.Router();

router.use("/", employeesPageRoutes);
router.use("/", employeeProfilePageRoutes);

export default router;
