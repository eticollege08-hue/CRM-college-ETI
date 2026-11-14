import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { ABOUT_US_MESSAGES } from "./about-us.constants.js";
import { aboutUsRepository } from "./about-us.repository.js";

import type { AboutUsRepository } from "./about-us.repository.js";
import type { AboutUsCreateInput, AboutUsUpdateInput } from "./about-us.types.js";

export class AboutUsService {
    constructor(private readonly repository: AboutUsRepository = aboutUsRepository) {}

    async create(data: AboutUsCreateInput, companyId: string) {
        return await this.repository.create(data, companyId);
    }

    async getAll(companyId: string) {
        return await this.repository.getAll(companyId);
    }

    async getById(id: string, companyId: string) {
        const aboutUs = await this.repository.getById(id, companyId);
        if (!aboutUs) {
            throw new ApiError(HttpStatus.NOT_FOUND, ABOUT_US_MESSAGES.NOT_FOUND);
        }
        return aboutUs;
    }

    async update(id: string, companyId: string, data: AboutUsUpdateInput) {
        await this.getById(id, companyId);
        return await this.repository.update(id, companyId, data);
    }

    async delete(id: string, companyId: string) {
        await this.getById(id, companyId);
        return await this.repository.delete(id, companyId);
    }
}

export const aboutUsService = new AboutUsService();
