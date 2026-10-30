import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { ProjectCreateInput, ProjectUpdateInput } from "./projects.types.js";

export class ProjectsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: ProjectCreateInput) {
        return await this.db.project.create({ data });
    }

    async getAll() {
        return await this.db.project.findMany();
    }

    async getById(id: string) {
        return await this.db.project.findUnique({ where: { id } });
    }

    async update(id: string, data: ProjectUpdateInput) {
        return await this.db.project.update({ where: { id }, data });
    }

    async delete(id: string) {
        return await this.db.project.delete({ where: { id } });
    }
}

export const projectsRepository = new ProjectsRepository();
