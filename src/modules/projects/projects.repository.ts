import prisma from "#config/prisma.config.js";

import type { PrismaClient } from "@prisma/client";
import type { ProjectCreateInput, ProjectUpdateInput } from "./projects.types.js";

export class ProjectsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: ProjectCreateInput) {
        const { ownerId, budget, deadline, links, memberIds, ...projectData } = data;
        return await this.db.project.create({
            data: {
                ...projectData,
                budget,
                deadline: deadline ? new Date(`${deadline}T00:00:00.000Z`) : undefined,
                owner: ownerId ? { connect: { id: ownerId } } : undefined,
                links: links
                    ? { create: links.map((url, sortOrder) => ({ url, sortOrder })) }
                    : undefined,
                members: memberIds
                    ? {
                          create: memberIds.map((employeeId) => ({
                              employee: { connect: { id: employeeId } },
                          })),
                      }
                    : undefined,
            },
            include: this.projectRelations,
        });
    }

    async getAll() {
        return await this.db.project.findMany({
            include: this.projectRelations,
            orderBy: { title: "asc" },
        });
    }

    async getById(id: string) {
        return await this.db.project.findUnique({ where: { id }, include: this.projectRelations });
    }

    async update(id: string, data: ProjectUpdateInput) {
        const { ownerId, budget, deadline, links, memberIds, ...projectData } = data;
        return await this.db.$transaction(async (tx) => {
            await tx.project.update({
                where: { id },
                data: {
                    ...projectData,
                    ...(ownerId !== undefined
                        ? { owner: ownerId ? { connect: { id: ownerId } } : { disconnect: true } }
                        : {}),
                    ...(budget !== undefined ? { budget } : {}),
                    ...(deadline !== undefined
                        ? { deadline: deadline ? new Date(`${deadline}T00:00:00.000Z`) : null }
                        : {}),
                },
            });
            if (links !== undefined) {
                await tx.projectLink.deleteMany({ where: { projectId: id } });
                if (links.length) {
                    await tx.projectLink.createMany({
                        data: links.map((url, sortOrder) => ({ projectId: id, url, sortOrder })),
                    });
                }
            }
            if (memberIds !== undefined) {
                await tx.projectMember.deleteMany({ where: { projectId: id } });
                if (memberIds.length) {
                    await tx.projectMember.createMany({
                        data: memberIds.map((employeeId) => ({ projectId: id, employeeId })),
                    });
                }
            }
            return await tx.project.findUniqueOrThrow({
                where: { id },
                include: this.projectRelations,
            });
        });
    }

    async delete(id: string) {
        return await this.db.project.delete({ where: { id } });
    }

    async getEmployeesByIds(ids: string[]) {
        return await this.db.employee.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });
    }

    private readonly projectRelations = {
        owner: { select: { id: true, fullName: true, position: true } },
        members: {
            include: { employee: { select: { id: true, fullName: true, position: true } } },
        },
        links: { orderBy: { sortOrder: "asc" as const } },
    };
}

export const projectsRepository = new ProjectsRepository();
