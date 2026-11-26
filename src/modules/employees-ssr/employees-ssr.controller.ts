import { teamsService } from "#modules/teams/teams.service.js";
import { projectsService } from "#modules/projects/projects.service.js";
import { employeeListSchema } from "#modules/employees/employee.schema.js";
import { employeeService } from "#modules/employees/employee.service.js";
import { authPageService } from "#modules/auth-ssr/auth-ssr.service.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import {
    ADD_EMPLOYEE_PAGE,
    EMPLOYEE_DETAILS_PAGE,
    EMPLOYEES_PAGE,
} from "./employees-ssr.constants.js";
import { employeesPageService } from "./employees-ssr.service.js";

import type { Request, Response } from "express";

export const employeesPageController = {
    async index(req: Request, res: Response) {
        const actor = getAuthUser(req);
        const query = employeeListSchema.parse(
            Object.fromEntries(Object.entries(req.query).filter(([, value]) => value !== "")),
        );
        const list = await employeeService.list(actor, query);
        const link = (page: number) =>
            "?" +
            new URLSearchParams(
                Object.entries({ ...query, page }).map(([k, v]) => [k, String(v)]),
            ).toString();
        const payload = {
            ...list,
            query,
            teams: await teamsService.list(actor.companyId),
            projects: await projectsService.getAll(actor.companyId),
            profile: (await authPageService.getProfilePageData(actor.userId)).profile,
            previous: query.page > 1 ? link(query.page - 1) : null,
            next: list.hasNext ? link(query.page + 1) : null,
        };
        res.render(EMPLOYEES_PAGE.path, { ...payload, ...EMPLOYEES_PAGE.data });
    },

    async profile(req: Request, res: Response) {
        const actor = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const payload = await employeesPageService.getProfilePageData(id, actor);
        res.render(EMPLOYEE_DETAILS_PAGE.path, {
            profile: (await authPageService.getProfilePageData(actor.userId)).profile,
            ...EMPLOYEE_DETAILS_PAGE.data,
            ...payload,
            candidates: ["OWNER", "HR"].includes(actor.role)
                ? await employeeService.getAll(actor.companyId)
                : [],
        });
    },

    async add(_req: Request, res: Response) {
        res.render(ADD_EMPLOYEE_PAGE.path, ADD_EMPLOYEE_PAGE.data);
    },
};
