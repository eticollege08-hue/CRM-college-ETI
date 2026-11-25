import { HttpStatus } from "#constants/http-status.constants.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { ABOUT_US_MESSAGES } from "./about-us.constants.js";
import { aboutUsService } from "./about-us.service.js";

import type { AboutUsService } from "./about-us.service.js";
import type { Request, Response } from "express";

export class AboutUsController {
    constructor(private readonly service: AboutUsService = aboutUsService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const aboutUs = await this.service.create(req.body, companyId);
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: ABOUT_US_MESSAGES.CREATED,
            aboutUs,
        });
    }

    async getAll(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const aboutUsRecords = await this.service.getAll(companyId);
        res.status(HttpStatus.OK).json({ success: true, aboutUsRecords });
    }

    async getById(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const aboutUs = await this.service.getById(id, companyId);
        res.status(HttpStatus.OK).json({ success: true, aboutUs });
    }

    async update(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        const aboutUs = await this.service.update(id, companyId, req.body);
        res.status(HttpStatus.OK).json({
            success: true,
            message: ABOUT_US_MESSAGES.UPDATED,
            aboutUs,
        });
    }

    async delete(req: Request, res: Response) {
        const { companyId } = getAuthUser(req);
        const { id } = uuidSchema.parse(req.params);
        await this.service.delete(id, companyId);
        res.status(HttpStatus.OK).json({ success: true, message: ABOUT_US_MESSAGES.DELETED });
    }
}

export const aboutUsController = new AboutUsController();
