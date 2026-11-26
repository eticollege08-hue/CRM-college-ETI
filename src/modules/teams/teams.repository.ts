import prisma from "#config/prisma.config.js";
import type { PrismaClient } from "@prisma/client";

const summarySelect = {
    id: true,
    name: true,
    _count: { select: { members: { where: { employee: { deletedAt: null } } } } },
} as const;
export class TeamsRepository {
    constructor(private readonly db: PrismaClient = prisma) {}
    list(companyId: string) {
        return this.db.team.findMany({
            where: { companyId },
            select: summarySelect,
            orderBy: { name: "asc" },
        });
    }
    get(companyId: string, id: string) {
        return this.db.team.findUniqueOrThrow({ where: { id, companyId }, select: summarySelect });
    }
    create(companyId: string, name: string) {
        return this.db.team.create({ data: { companyId, name }, select: summarySelect });
    }
    rename(companyId: string, id: string, name: string) {
        return this.db.team.update({
            where: { companyId, id },
            data: { name },
            select: summarySelect,
        });
    }
    remove(companyId: string, id: string) {
        return this.db.team.delete({ where: { id, companyId } });
    }
    members(companyId: string, id: string) {
        return this.db.team.findUniqueOrThrow({
            where: { id, companyId },
            select: {
                members: {
                    where: { companyId, employee: { deletedAt: null } },
                    orderBy: { employeeId: "asc" },
                    select: {
                        employee: {
                            select: { id: true, fullName: true, position: true, imageId: true },
                        },
                    },
                },
            },
        });
    }
    add(companyId: string, teamId: string, employeeId: string) {
        return this.db.$transaction(async (tx) => {
            await tx.team.findUniqueOrThrow({
                where: { id: teamId, companyId },
                select: { id: true },
            });
            await tx.employee.findUniqueOrThrow({
                where: { id: employeeId, companyId, deletedAt: null },
                select: { id: true },
            });
            return tx.teamMember.create({ data: { companyId, teamId, employeeId } });
        });
    }
    drop(companyId: string, teamId: string, employeeId: string) {
        return this.db.teamMember.delete({
            where: { teamId_employeeId: { teamId, employeeId }, companyId },
        });
    }
    addToProject(companyId: string, projectId: string, teamId: string) {
        return this.db.$transaction(async (tx) => {
            await tx.project.findUniqueOrThrow({
                where: { id: projectId, companyId },
                select: { id: true },
            });
            const { members } = await tx.team.findUniqueOrThrow({
                where: { id: teamId, companyId },
                select: {
                    members: {
                        where: { companyId },
                        orderBy: { employeeId: "asc" },
                        select: { employee: { select: { id: true, deletedAt: true } } },
                    },
                },
            });
            const employees = members.map((row) => row.employee);
            const added = await tx.employeeProject.createManyAndReturn({
                data: employees
                    .filter((e) => !e.deletedAt)
                    .map((e) => ({ employeeId: e.id, companyId, projectId })),
                skipDuplicates: true,
                select: { employeeId: true },
            });
            const inserted = new Set(added.map((row) => row.employeeId));
            return {
                addedCount: added.length,
                skipped: employees
                    .filter((e) => !inserted.has(e.id))
                    .map((e) => ({
                        employeeId: e.id,
                        reason: e.deletedAt ? "DISMISSED" : "ALREADY_MEMBER",
                    })),
            };
        });
    }
}
export const teamsRepository = new TeamsRepository();
