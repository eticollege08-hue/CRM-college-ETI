import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { ProjectCreateInput, ProjectUpdateInput } from "./projects.types.js";

export class ProjectsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: ProjectCreateInput, companyId: string) {
        return await this.db.project.create({ data: { ...data, companyId } });
    }

    async getAll(companyId: string) {
        return await this.db.project.findMany({ where: { companyId } });
    }

    async getById(id: string, companyId: string) {
        return await this.db.project.findUnique({ where: { id, companyId } });
    }

    async update(id: string, companyId: string, data: ProjectUpdateInput) {
        return await this.db.project.update({ where: { id, companyId }, data });
    }

    async delete(id: string, companyId: string) {
        return await this.db.project.delete({ where: { id, companyId } });
    }
}

export const projectsRepository = new ProjectsRepository();
