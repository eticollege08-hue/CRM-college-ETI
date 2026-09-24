import { exampleRepository, ExampleRepository } from "./example.repository.js";
import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { EXAMPLE_FAILURE_MESSAGES } from "./example.constants.js";

import type { UUID } from "node:crypto";
import type { ExampleCreateInput, ExampleUpdateInput } from "./example.types.js";

export class ExampleService {
    constructor(private readonly repository: ExampleRepository = exampleRepository) {}

    async create(data: ExampleCreateInput) {
        return await this.repository.create(data);
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: UUID) {
        const item = await this.repository.getById(id);
        if (!item) {
            throw new ApiError(HttpStatus.NOT_FOUND, EXAMPLE_FAILURE_MESSAGES.NOT_FOUND);
        }
        
        return item;
    }

    async update(id: UUID, data: ExampleUpdateInput) {
        const isExist = await this.repository.getById(id);
        if (!isExist) {
            throw new ApiError(HttpStatus.NOT_FOUND, EXAMPLE_FAILURE_MESSAGES.NOT_FOUND);
        }

        return await this.repository.update(id, data);
    }

    async delete(id: UUID) {
        const isExist = await this.repository.getById(id);
        if (!isExist) {
            throw new ApiError(HttpStatus.NOT_FOUND, EXAMPLE_FAILURE_MESSAGES.NOT_FOUND);
        }

        return await this.repository.delete(id);
    }
}

export const exampleService = new ExampleService();