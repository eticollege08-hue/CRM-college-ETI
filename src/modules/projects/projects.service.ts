import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { PROJECT_MESSAGES } from "./projects.constants.js";
import { projectsRepository } from "./projects.repository.js";

import type { ProjectsRepository } from "./projects.repository.js";
import type { ProjectCreateInput, ProjectUpdateInput } from "./projects.types.js";

export class ProjectsService {
    constructor(private readonly repository: ProjectsRepository = projectsRepository) {}

    async create(data: ProjectCreateInput) {
        await this.validateEmployees(data.ownerId, data.memberIds);
        return await this.repository.create(data);
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: string) {
        const project = await this.repository.getById(id);
        if (!project) {
            throw new ApiError(HttpStatus.NOT_FOUND, PROJECT_MESSAGES.NOT_FOUND);
        }

        return project;
    }

    async update(id: string, data: ProjectUpdateInput) {
        await this.getById(id);
        await this.validateEmployees(data.ownerId, data.memberIds);
        return await this.repository.update(id, data);
    }

    async delete(id: string) {
        await this.getById(id);
        return await this.repository.delete(id);
    }

    private async validateEmployees(ownerId?: string | null, memberIds?: string[]) {
        const requestedIds = [...new Set([...(ownerId ? [ownerId] : []), ...(memberIds ?? [])])];
        if (!requestedIds.length) return;
        const employees = await this.repository.getEmployeesByIds(requestedIds);
        if (employees.length !== requestedIds.length) {
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "One or more employees were not found.",
                [{ field: "ownerId/memberIds", message: "Select existing employees." }],
            );
        }
    }
}

export const projectsService = new ProjectsService();
