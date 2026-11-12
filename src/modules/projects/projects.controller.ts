import { HttpStatus } from "#constants/http-status.constants.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { PROJECT_MESSAGES } from "./projects.constants.js";
import { projectsService } from "./projects.service.js";

import type { ProjectsService } from "./projects.service.js";
import type { Request, Response } from "express";

export class ProjectsController {
    constructor(private readonly service: ProjectsService = projectsService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const project = await this.service.create(req.body, companyId);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: PROJECT_MESSAGES.CREATED,
            project,
        });
    }

    async getAll(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const projects = await this.service.getAll(companyId);
        res.status(HttpStatus.OK).json({ success: true, projects });
    }

    async getById(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const project = await this.service.getById(id, companyId);
        res.status(HttpStatus.OK).json({ success: true, project });
    }

    async update(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const project = await this.service.update(id, companyId, req.body);
        res.status(HttpStatus.OK).json({
            success: true,
            message: PROJECT_MESSAGES.UPDATED,
            project,
        });
    }

    async delete(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        await this.service.delete(id, companyId);
        res.status(HttpStatus.OK).json({ success: true, message: PROJECT_MESSAGES.DELETED });
    }
}

export const projectsController = new ProjectsController();
