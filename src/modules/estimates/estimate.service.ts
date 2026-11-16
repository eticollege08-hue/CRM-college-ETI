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

    async create(data: EstimateCreateInput, createdBy: string, companyId: string) {
        return await this.repository.create({ ...data, createdBy, companyId });
    }

    async getById(id: string, companyId: string) {
        const estimate = await this.repository.getById(id, companyId);
        if (!estimate) {
            throw new ApiError(HttpStatus.NOT_FOUND, ESTIMATE_MESSAGES.NOT_FOUND);
        }
        return estimate;
    }

    async getList(query: EstimateListQuery, companyId: string) {
        return await this.repository.getList(query, companyId);
    }

    async update(id: string, companyId: string, data: EstimateUpdateInput) {
        await this.getById(id, companyId);
        return await this.repository.update(id, companyId, data);
    }

    async delete(id: string, companyId: string) {
        await this.getById(id, companyId);
        await this.repository.softDelete(id, companyId);
    }
}

export const estimateService = new EstimateService();
