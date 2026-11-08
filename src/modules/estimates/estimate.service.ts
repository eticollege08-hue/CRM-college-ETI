import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { ESTIMATE_MESSAGES } from "./estimate.constants.js";
import { estimateRepository } from "./estimate.repository.js";

import type { EstimateRepository } from "./estimate.repository.js";
import type {
    EstimateCreateInput,
    EstimateUpdateInput,
    EstimateListQuery,
} from "./estimate.types.js";

export class EstimateService {
    constructor(private readonly repository: EstimateRepository = estimateRepository) {}

    async create(data: EstimateCreateInput, createdBy: string) {
        return await this.repository.create({ ...data, createdBy });
    }

    async getById(id: string) {
        const estimate = await this.repository.getById(id);
        if (!estimate) {
            throw new ApiError(HttpStatus.NOT_FOUND, ESTIMATE_MESSAGES.NOT_FOUND);
        }
        return estimate;
    }

    async getList(query: EstimateListQuery) {
        return await this.repository.getList(query);
    }

    async update(id: string, data: EstimateUpdateInput) {
        await this.getById(id);
        return await this.repository.update(id, data);
    }

    async delete(id: string) {
        await this.getById(id);
        await this.repository.softDelete(id);
    }
}

export const estimateService = new EstimateService();
