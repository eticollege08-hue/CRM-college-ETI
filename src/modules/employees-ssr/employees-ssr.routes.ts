import { Router } from "express";

import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { isAuth } from "#middlewares/auth.middleware.js";
import { accessFor } from "#middlewares/access.middleware.js";
import { validateParams } from "#middlewares/validate.middleware.js";
import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";
import { employeeService } from "#modules/employees/employee.service.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { employeesPageController } from "./employees-ssr.controller.js";

const router = Router();
const DEFAULT_POSITIONS = ["Owner", "HR", "Manager", "Recruiter", "Worker"];

const ALL_ROLES = ["OWNER", "MANAGER", "RECRUITER", "HR", "WORKER"] as const;

router.get("/employees", isAuth, accessFor(ALL_ROLES), asyncCatch(employeesPageController.index));
router.get(
    "/employees/:id/profile",
    isAuth,
    accessFor(ALL_ROLES),
    validateParams(uuidSchema),
    asyncCatch(employeesPageController.profile),
);
router.get(
    "/employees/create",
    isAuth,
    accessFor(["OWNER", "RECRUITER"]),
    asyncCatch(async (req, res) => {
        if (!req.user) return res.redirect("/login");
        const { userId: accountId } = req.user;
        const [employees, profileData] = await Promise.all([
            employeeService.getAll(req.user),
            authPageService.getProfilePageData(accountId),
        ]);
        const positions = [
            ...new Set(
                DEFAULT_POSITIONS.concat(
                    employees
                        .map(({ position }) => position?.trim())
                        .filter((position): position is string => Boolean(position)),
                ),
            ),
        ].sort((first, second) => first.localeCompare(second));
        res.render("pages/employee-create", {
            ...profileData,
            css: "employee-create",
            js: "employee-create",
            activePage: "employees",
            hideBrand: true,
            employees,
            positions,
        });
    }),
);

export default router;
