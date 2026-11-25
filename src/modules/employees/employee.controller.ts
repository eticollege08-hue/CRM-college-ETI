import { HttpStatus } from "#constants/http-status.constants.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { dismissalSchema, employeeListSchema } from "./employee.schema.js";
import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeService } from "./employee.service.js";

import type { Request, Response } from "express";
import type { EmployeeService } from "./employee.service.js";

export class EmployeeController {
    constructor(private readonly service: EmployeeService = employeeService) {
        this.update = this.update.bind(this);
        this.updateSalary = this.updateSalary.bind(this);
    }

    list = async (req: Request, res: Response) => {
        res.json({
            success: true,
            ...(await this.service.list(getAuthUser(req), employeeListSchema.parse(req.query))),
        });
    };
    get = async (req: Request, res: Response) => {
        res.json({
            success: true,
            employee: await this.service.getById(String(req.params.id), getAuthUser(req)),
        });
    };
    create = async (req: Request, res: Response) => {
        const employee = await this.service.create(getAuthUser(req), req.body);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: EMPLOYEE_MESSAGES.CREATED,
            employee,
        });
    };
    dismiss = async (req: Request, res: Response) => {
        const { replacementManagerId } = dismissalSchema.parse(req.body ?? {});
        await this.service.dismiss(String(req.params.id), getAuthUser(req), replacementManagerId);
        res.json({ success: true, message: EMPLOYEE_MESSAGES.DELETED });
    };
    photo = async (req: Request, res: Response) => {
        const photo = await this.service.getPhoto(String(req.params.id), getAuthUser(req));
        res.set("Cache-Control", "private, no-store")
            .set("X-Content-Type-Options", "nosniff")
            .type(photo.mimeType)
            .send(photo.bytes);
    };
    upload = async (req: Request, res: Response) => {
        await this.service.putPhoto(
            String(req.params.id),
            getAuthUser(req),
            req.get("Content-Type") ?? "",
            req.body,
        );
        res.json({ success: true, message: EMPLOYEE_MESSAGES.UPDATED });
    };

    async update(req: Request, res: Response) {
        await this.service.update(req.params.id as string, getAuthUser(req), req.body);
        res.status(HttpStatus.OK).json({ success: true, message: EMPLOYEE_MESSAGES.UPDATED });
    }

    async updateSalary(req: Request, res: Response) {
        await this.service.updateSalary(req.params.id as string, getAuthUser(req), req.body);
        res.status(HttpStatus.OK).json({ success: true, message: EMPLOYEE_MESSAGES.UPDATED });
    }
}

export const employeeController = new EmployeeController();
