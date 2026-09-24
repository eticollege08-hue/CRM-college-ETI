import { exampleService, ExampleService } from "./example.service.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { EXAMPLE_SUCCESSFUL_MESSAGES } from "./example.constants.js";

import type { Request, Response } from "express";
import type { UUID } from "node:crypto";

export class ExampleController {
    constructor(private readonly service: ExampleService = exampleService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const example = await this.service.create(req.body);

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: EXAMPLE_SUCCESSFUL_MESSAGES.CREATED,
            example,
        });
    }

    async getAll(req: Request, res: Response) {
        const examples = await this.service.getAll();

        res.status(HttpStatus.OK).json({
            success: true,
            examples,
        });
    }

    async getById(req: Request, res: Response) {
        const { id } = req.params as { id: UUID };
        const example = await this.service.getById(id);

        res.status(HttpStatus.OK).json({
            success: true,
            example,
        });
    }

    async update(req: Request, res: Response) {
        const { id } = req.params as { id: UUID };
        const example = await this.service.update(id, req.body);

        res.status(HttpStatus.OK).json({
            success: true,
            message: EXAMPLE_SUCCESSFUL_MESSAGES.UPDATED,
            example,
        });
    }

    async delete(req: Request, res: Response) {
        const { id } = req.params as { id: UUID };
        await this.service.delete(id);

        res.status(HttpStatus.OK).json({
            success: true,
            message: EXAMPLE_SUCCESSFUL_MESSAGES.DELETED,
        });
    }
}

export const exampleController = new ExampleController();