import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { PROJECT_MESSAGES } from "./projects.constants.js";
import { projectsRepository } from "./projects.repository.js";

import type { ProjectsRepository } from "./projects.repository.js";
import type { ProjectCreateInput, ProjectUpdateInput } from "./projects.types.js";

export class ProjectsService {
    constructor(private readonly repository: ProjectsRepository = projectsRepository) {}

    async create(data: ProjectCreateInput, companyId: string) {
        return await this.repository.create(data, companyId);
    }

    async getAll(companyId: string) {
        return await this.repository.getAll(companyId);
    }

    async getById(id: string, companyId: string) {
        const project = await this.repository.getById(id, companyId);
        if (!project) {
            throw new ApiError(HttpStatus.NOT_FOUND, PROJECT_MESSAGES.NOT_FOUND);
        }

        return project;
    }

    async update(id: string, companyId: string, data: ProjectUpdateInput) {
        await this.getById(id, companyId);
        return await this.repository.update(id, companyId, data);
    }

    async delete(id: string, companyId: string, confirmName: string) {
        if (typeof confirmName !== "string" || confirmName.trim().length === 0) {
            throw new ApiError(HttpStatus.BAD_REQUEST, PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED, [
                { field: "confirmName", message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED },
            ]);
        }

        return await this.repository.transaction(async (tx) => {
            const project = await this.repository.getById(id, companyId, tx);
            if (!project) {
                throw new ApiError(HttpStatus.NOT_FOUND, PROJECT_MESSAGES.NOT_FOUND);
            }

            if (confirmName.trim() !== project.title) {
                throw new ApiError(HttpStatus.BAD_REQUEST, PROJECT_MESSAGES.CONFIRM_NAME_MISMATCH, [
                    { field: "confirmName", message: PROJECT_MESSAGES.CONFIRM_NAME_MISMATCH },
                ]);
            }

            return await this.repository.delete(id, companyId, tx);
        });
    }
}

export const projectsService = new ProjectsService();
