import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { validateParams } from "#middlewares/validate.middleware.js";
import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";
import { employeeService } from "#modules/employees/employee.service.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { employeesPageController } from "./employees-ssr.controller.js";

const router = Router();

router.get("/employees", isAuth, asyncCatch(employeesPageController.index));
router.get(
    "/employees/:id/profile",
    isAuth,
    validateParams(uuidSchema),
    asyncCatch(employeesPageController.profile),
);
router.get(
    "/employees/create",
    isAuth,
    asyncCatch(async (req, res) => {
        const accountId = req.user?.userId;
        if (!accountId) return res.redirect("/login");
        const [employees, profileData] = await Promise.all([
            employeeService.getAll(),
            authPageService.getProfilePageData(accountId),
        ]);
        res.render("pages/employee-create", {
            ...profileData,
            css: "employee-create",
            js: "employee-create",
            activePage: "employees",
            hideBrand: true,
            employees,
        });
    }),
);

export default router;
