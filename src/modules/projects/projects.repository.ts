import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProjectCreateInput, ProjectUpdateInput } from "./projects.types.js";

export class ProjectsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: ProjectCreateInput, companyId: string) {
        return await this.db.project.create({ data: { ...data, companyId } });
    }

    async getAll(companyId: string) {
        return await this.db.project.findMany({ where: { companyId } });
    }

    async getById(
        id: string,
        companyId: string,
        client: Prisma.TransactionClient | PrismaClient = this.db,
    ) {
        return await client.project.findUnique({ where: { id, companyId } });
    }

    async update(id: string, companyId: string, data: ProjectUpdateInput) {
        return await this.db.project.update({ where: { id, companyId }, data });
    }

    async delete(
        id: string,
        companyId: string,
        client: Prisma.TransactionClient | PrismaClient = this.db,
    ) {
        return await client.project.delete({ where: { id, companyId } });
    }

    async transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return await this.db.$transaction(operation);
    }
}

export const projectsRepository = new ProjectsRepository();
