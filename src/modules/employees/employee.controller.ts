import { HttpStatus } from "#constants/http-status.constants.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeService } from "./employee.service.js";

import type { Request, Response } from "express";
import type { EmployeeService } from "./employee.service.js";

export class EmployeeController {
    constructor(private readonly service: EmployeeService = employeeService) {
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
    }

    async create(req: Request, res: Response) {
        const employee = await this.service.create(req.body);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: EMPLOYEE_MESSAGES.CREATED,
            employee,
        });
    }

    async update(req: Request, res: Response) {
        await this.service.update(req.params.id as string, req.body);
        res.status(HttpStatus.OK).json({ success: true, message: EMPLOYEE_MESSAGES.UPDATED });
    }
}

export const employeeController = new EmployeeController();
