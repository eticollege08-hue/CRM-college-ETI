import { HttpStatus } from "#constants/http-status.constants.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { EMPLOYEE_MESSAGES } from "./employee.constants.js";
import { employeeService } from "./employee.service.js";

import type { Request, Response } from "express";
import type { EmployeeService } from "./employee.service.js";

export class EmployeeController {
    constructor(private readonly service: EmployeeService = employeeService) {
        this.update = this.update.bind(this);
    }

    async update(req: Request, res: Response) {
        await this.service.update(req.params.id as string, getAuthUser(req), req.body);
        res.status(HttpStatus.OK).json({ success: true, message: EMPLOYEE_MESSAGES.UPDATED });
    }
}

export const employeeController = new EmployeeController();
