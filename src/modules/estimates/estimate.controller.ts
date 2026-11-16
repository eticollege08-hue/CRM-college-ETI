import { HttpStatus } from "#constants/http-status.constants.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { ESTIMATE_MESSAGES } from "./estimate.constants.js";
import { estimateListQuerySchema } from "./estimate.schema.js";
import { estimateService } from "./estimate.service.js";

import type { Request, Response } from "express";
import type { EstimateService } from "./estimate.service.js";

export class EstimateController {
    constructor(private readonly service: EstimateService = estimateService) {
        this.create = this.create.bind(this);
        this.getById = this.getById.bind(this);
        this.getList = this.getList.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const { userId, companyId } = getAuthUser(req);
        const estimate = await this.service.create(req.body, userId, companyId);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: ESTIMATE_MESSAGES.CREATED,
            estimate,
        });
    }

    async getById(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const estimate = await this.service.getById(id, companyId);
        res.status(HttpStatus.OK).json({
            success: true,
            estimate,
        });
    }

    async getList(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const query = estimateListQuerySchema.parse(req.query);
        const { estimates, meta } = await this.service.getList(query, companyId);
        res.status(HttpStatus.OK).json({
            success: true,
            estimates,
            meta,
        });
    }

    async update(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const estimate = await this.service.update(id, companyId, req.body);
        res.status(HttpStatus.OK).json({
            success: true,
            message: ESTIMATE_MESSAGES.UPDATED,
            estimate,
        });
    }

    async delete(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        await this.service.delete(id, companyId);
        res.status(HttpStatus.OK).json({
            success: true,
            message: ESTIMATE_MESSAGES.DELETED,
        });
    }
}

export const estimateController = new EstimateController();
