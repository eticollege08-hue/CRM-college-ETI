import { HttpStatus } from "#constants/http-status.constants.js";
import { uuidSchema } from "#schemas/id.schema.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeService } from "./employee.service.js";

import type { EmployeeService } from "./employee.service.js";
import type { Request, Response } from "express";

export class EmployeeController {
    constructor(private readonly service: EmployeeService = employeeService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const employee = await this.service.create(req.body);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: EMPLOYEE_MESSAGES.CREATED,
            employee,
        });
    }

    async getAll(_req: Request, res: Response) {
        const employees = await this.service.getAll();
        res.status(HttpStatus.OK).json({ success: true, employees });
    }

    async getById(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const employee = await this.service.getById(id);
        res.status(HttpStatus.OK).json({ success: true, employee });
    }

    async update(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);

        const employee = await this.service.update(id, req.body, req.user!.role, req.user!.userId);
        res.status(HttpStatus.OK).json({
            success: true,
            message: EMPLOYEE_MESSAGES.UPDATED,
            employee,
        });
    }

    async delete(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        await this.service.delete(id);
        res.status(HttpStatus.OK).json({ success: true, message: EMPLOYEE_MESSAGES.DELETED });
    }
}

export const employeeController = new EmployeeController();
