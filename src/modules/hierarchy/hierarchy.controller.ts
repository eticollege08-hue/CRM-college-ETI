import { HttpStatus } from "#constants/http-status.constants.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { HIERARCHY_MESSAGES } from "./hierarchy.constants.js";
import { hierarchyService } from "./hierarchy.service.js";

import type { Request, Response } from "express";
import type { HierarchyService } from "./hierarchy.service.js";

export class HierarchyController {
    constructor(private readonly service: HierarchyService = hierarchyService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const hierarchy = await this.service.create(req.body, companyId);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: HIERARCHY_MESSAGES.CREATED,
            hierarchy,
        });
    }

    async getAll(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const hierarchies = await this.service.getAll(companyId);
        res.status(HttpStatus.OK).json({ success: true, hierarchies });
    }

    async getById(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const hierarchy = await this.service.getById(req.params.id as string, companyId);
        res.status(HttpStatus.OK).json({ success: true, hierarchy });
    }

    async update(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const hierarchy = await this.service.update(req.params.id as string, companyId, req.body);
        res.status(HttpStatus.OK).json({
            success: true,
            message: HIERARCHY_MESSAGES.UPDATED,
            hierarchy,
        });
    }

    async delete(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        await this.service.delete(req.params.id as string, companyId);
        res.status(HttpStatus.OK).json({ success: true, message: HIERARCHY_MESSAGES.DELETED });
    }
}

export const hierarchyController = new HierarchyController();
