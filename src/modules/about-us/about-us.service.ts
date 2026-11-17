import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { ABOUT_US_MESSAGES } from "./about-us.constants.js";
import { aboutUsRepository } from "./about-us.repository.js";

import type { AboutUsRepository } from "./about-us.repository.js";
import type { AboutUsCreateInput, AboutUsUpdateInput } from "./about-us.types.js";

export class AboutUsService {
    constructor(private readonly repository: AboutUsRepository = aboutUsRepository) {}

    async create(data: AboutUsCreateInput) {
        return await this.repository.create(data);
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: string) {
        const aboutUs = await this.repository.getById(id);
        if (!aboutUs) {
            throw new ApiError(HttpStatus.NOT_FOUND, ABOUT_US_MESSAGES.NOT_FOUND);
        }
        return aboutUs;
    }

    async update(id: string, data: AboutUsUpdateInput) {
        await this.getById(id);
        return await this.repository.update(id, data);
    }

    async delete(id: string) {
        await this.getById(id);
        return await this.repository.delete(id);
    }

    async reorder(ids: string[]) {
        const records = await this.repository.getAll();
        if (
            records.length !== ids.length ||
            new Set(ids).size !== ids.length ||
            records.some((record) => !ids.includes(record.id))
        ) {
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Order must include every About Us record once",
            );
        }
        return await this.repository.reorder(ids);
    }
}

export const aboutUsService = new AboutUsService();
