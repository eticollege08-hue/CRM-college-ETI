import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";

import { employeesPageController } from "./employees-ssr.controller.js";

const router = Router();

router.get("/employees", asyncCatch(employeesPageController.index));

export default router;
