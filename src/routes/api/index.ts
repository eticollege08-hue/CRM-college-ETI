import express from "express";

import { isAuth } from "#middlewares/auth.middleware.js";

import authRoutes from "#modules/auth/auth.routes.js";
import docsRouter from "#modules/docs/docs.router.js";
import employeeRouter from "#modules/employees/employee.router.js";

const router = express.Router();

router.use("/docs", docsRouter);
router.use("/auth", authRoutes);
router.use("/employees", isAuth, employeeRouter);

export default router;
