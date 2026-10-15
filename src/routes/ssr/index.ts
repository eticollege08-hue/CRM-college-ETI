import express from "express";

import authPageRoutes from "#modules/auth-ssr/auth-ssr.routes.js";
import employeesPageRoutes from "#modules/employees-ssr/employees-ssr.routes.js";

const router = express.Router();

router.use("/", employeesPageRoutes);
router.use("/", authPageRoutes);

export default router;
