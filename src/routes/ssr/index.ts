import express from "express";

import employeesPageRoutes from "#modules/employees-ssr/employees-ssr.routes.js";

const router = express.Router();

router.use("/", employeesPageRoutes);

export default router;
