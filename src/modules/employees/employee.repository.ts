import { randomUUID } from "node:crypto";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";
import prisma from "#config/prisma.config.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
    EmployeeCreateInput,
    EmployeeListQuery,
    EmployeeUpdateInput,
} from "./employee.types.js";

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async getAll(companyId: string, query?: EmployeeListQuery) {
        return await this.db.employee.findMany({
            where: {
                companyId,
                deletedAt: null,
                level: query?.level,
                position: query?.position,
                ...(query?.teamId ? { teamMemberships: { some: { teamId: query.teamId } } } : {}),
                ...(query?.projectId
                    ? { memberships: { some: { projectId: query.projectId } } }
                    : {}),
            },
            ...(query ? { skip: (query.page - 1) * query.limit, take: query.limit + 1 } : {}),
            include: {
                userAccount: { select: { email: true, roleKey: true } },
                compensation: { select: { salary: true, currency: true } },
            },
            orderBy: [{ fullName: "asc" }, { id: "asc" }],
        });
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        return await tx.employee.findUnique({ where: { id, companyId, deletedAt: null } });
    }

    async getWithCompensation(id: string, companyId: string) {
        return await this.db.employee.findUnique({
            where: { id, companyId, deletedAt: null },
            include: {
                _count: { select: { subordinates: true } },
                managers: { select: { manager: { select: { id: true, fullName: true } } } },
                memberships: { select: { project: { select: { id: true, title: true } } } },
                userAccount: { select: { email: true, roleKey: true } },
                compensation: { select: { salary: true, currency: true } },
            },
        });
    }

    async update(id: string, companyId: string, data: EmployeeUpdateInput) {
        const { managerId, projectIds, ...fields } = data;
        if (managerId === undefined && projectIds === undefined)
            return this.db.employee.update({
                where: { id, companyId, deletedAt: null },
                data: fields,
            });
        return this.db.$transaction(
            async (tx) => {
                if (managerId !== undefined) {
                    if (managerId) await this.validateManager(tx, companyId, id, managerId);
                    await tx.hierarchy.deleteMany({ where: { companyId, subordinateId: id } });
                    if (managerId)
                        await tx.hierarchy.create({
                            data: { companyId, employeeId: managerId, subordinateId: id },
                        });
                }
                if (projectIds) {
                    const ids = [...new Set(projectIds)];
                    if (
                        (await tx.project.count({ where: { companyId, id: { in: ids } } })) !==
                        ids.length
                    )
                        throw new ApiError(HttpStatus.NOT_FOUND, "Not found");
                    await tx.employeeProject.deleteMany({ where: { employeeId: id, companyId } });
                    await tx.employeeProject.createMany({
                        data: ids.map((projectId) => ({ projectId, companyId, employeeId: id })),
                    });
                }
                return tx.employee.update({
                    where: { id, companyId, deletedAt: null },
                    data: fields,
                });
            },
            { isolationLevel: "Serializable" },
        );
    }

    private async validateManager(
        tx: Prisma.TransactionClient,
        companyId: string,
        employeeId: string,
        managerId: string,
    ) {
        if (!(await this.getById(managerId, companyId, tx)))
            throw new ApiError(HttpStatus.NOT_FOUND, "Not found");
        const links = await tx.hierarchy.findMany({
            where: { companyId },
            select: { employeeId: true, subordinateId: true },
        });
        const visited = new Set<string>();
        const pending = [employeeId];
        for (const id of pending) {
            if (id === managerId)
                throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, "Hierarchy cycle");
            if (visited.has(id)) continue;
            visited.add(id);
            for (const link of links) if (link.employeeId === id) pending.push(link.subordinateId);
        }
    }

    async create(
        companyId: string,
        data: Omit<EmployeeCreateInput, "password">,
        passwordHash: string,
    ) {
        const { email, role, salary, managerId, ...fields } = data;
        return this.db.$transaction(
            async (tx) => {
                if (managerId && !(await this.getById(managerId, companyId, tx)))
                    throw new ApiError(HttpStatus.NOT_FOUND, "Not found");
                const employee = await tx.employee.create({
                    data: { ...fields, companyId },
                    select: { id: true },
                });
                const employeeId = employee.id;
                await tx.employeeCompensation.create({ data: { companyId, employeeId, salary } });
                await tx.userAccount.create({
                    data: { companyId, employeeId, email, passwordHash, roleKey: role },
                });
                if (managerId)
                    await tx.hierarchy.create({
                        data: { companyId, employeeId: managerId, subordinateId: employeeId },
                    });
                return employee;
            },
            { isolationLevel: "Serializable" },
        );
    }

    async dismiss(
        id: string,
        companyId: string,
        accountId: string,
        replacement: string | null | undefined,
    ) {
        await this.db.$transaction(
            async (tx) => {
                if (!(await this.getById(id, companyId, tx)))
                    throw new ApiError(HttpStatus.NOT_FOUND, "Not found");
                if (
                    await tx.userAccount.findFirst({
                        where: { id: accountId, companyId, employeeId: id },
                    })
                )
                    throw new ApiError(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "You cannot dismiss yourself.",
                    );
                const reports = await tx.hierarchy.findMany({
                    where: { employeeId: id, companyId },
                });
                if (reports.length && replacement === undefined)
                    throw new ApiError(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Choose a replacement manager or no manager.",
                    );
                if (replacement) await this.validateManager(tx, companyId, id, replacement);
                await tx.hierarchy.deleteMany({
                    where: {
                        companyId,
                        OR: [
                            { employeeId: id },
                            {
                                subordinateId: {
                                    in: [id, ...reports.map((report) => report.subordinateId)],
                                },
                            },
                        ],
                    },
                });
                if (replacement && reports.length)
                    await tx.hierarchy.createMany({
                        data: reports.map(({ subordinateId }) => ({
                            companyId,
                            employeeId: replacement,
                            subordinateId,
                        })),
                        skipDuplicates: true,
                    });
                await tx.userAccount.updateMany({
                    where: { employeeId: id, companyId },
                    data: { isActive: false },
                });
                await tx.employee.update({
                    where: { id, companyId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            },
            { isolationLevel: "Serializable" },
        );
    }

    async putPhoto(id: string, companyId: string, mimeType: string, bytes: Buffer) {
        const imageId = randomUUID();
        await this.db.employee.update({
            where: { id, companyId, deletedAt: null },
            data: {
                imageId,
                photo: { upsert: { create: { mimeType, bytes }, update: { mimeType, bytes } } },
            },
        });
    }
    async getPhoto(employeeId: string, companyId: string) {
        return this.db.employeePhoto.findFirst({
            where: { employeeId, companyId, employee: { deletedAt: null } },
        });
    }

    async upsertCompensation(
        employeeId: string,
        companyId: string,
        salary: number,
        currency?: string,
    ) {
        return await this.db.employeeCompensation.upsert({
            where: { employeeId_companyId: { employeeId, companyId } },
            create: { employeeId, companyId, salary, currency: currency ?? "USD" },
            update: { salary, ...(currency === undefined ? {} : { currency }) },
        });
    }
}

export const employeeRepository = new EmployeeRepository();
