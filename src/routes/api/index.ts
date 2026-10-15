import express from "express";

import docsRouter from "#modules/docs/docs.router.js";
import employeeRouter from "#modules/employees/employee.router.js";

const router = express.Router();

router.use("/docs", docsRouter);
router.use("/employees", employeeRouter);

export default router;
