import { Prisma } from "@prisma/client";

import prisma from "#config/prisma.config.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { employeeRepository } from "#modules/employees/employee.repository.js";
import { ApiError } from "#utils/error.util.js";

import { HIERARCHY_MESSAGES, HIERARCHY_TRANSACTION_MAX_ATTEMPTS } from "./hierarchy.constants.js";
import { hierarchyRepository } from "./hierarchy.repository.js";

import type { PrismaClient } from "@prisma/client";
import type { EmployeeRepository } from "#modules/employees/employee.repository.js";
import type { HierarchyRepository } from "./hierarchy.repository.js";
import type { HierarchyCreateInput, HierarchyUpdateInput } from "./hierarchy.types.js";

export class HierarchyService {
    constructor(
        private readonly repository: HierarchyRepository = hierarchyRepository,
        private readonly employees: EmployeeRepository = employeeRepository,
        private readonly db: PrismaClient = prisma,
    ) {}

    async create(data: HierarchyCreateInput, companyId: string) {
        return await this.runInTransaction(async (tx) => {
            await this.checkRelationship(data, companyId, tx);
            return await this.repository.create(data, companyId, tx);
        });
    }

    async getAll(companyId: string) {
        return await this.repository.getAll(companyId);
    }

    async getById(id: string, companyId: string, tx: Prisma.TransactionClient = this.db) {
        const hierarchy = await this.repository.getById(id, companyId, tx);

        if (!hierarchy) {
            throw new ApiError(HttpStatus.NOT_FOUND, HIERARCHY_MESSAGES.NOT_FOUND);
        }

        return hierarchy;
    }

    async update(id: string, companyId: string, data: HierarchyUpdateInput) {
        return await this.runInTransaction(async (tx) => {
            const hierarchy = await this.getById(id, companyId, tx);

            await this.checkRelationship(
                {
                    employeeId: data.employeeId ?? hierarchy.employeeId,
                    subordinateId: data.subordinateId ?? hierarchy.subordinateId,
                },
                companyId,
                tx,
                id,
            );

            return await this.repository.update(id, companyId, data, tx);
        });
    }

    async delete(id: string, companyId: string) {
        return await this.runInTransaction(async (tx) => {
            await this.getById(id, companyId, tx);
            return await this.repository.delete(id, companyId, tx);
        });
    }

    async isManager(employeeId: string, managerId: string, companyId: string): Promise<boolean> {
        if (employeeId === managerId) return false;

        const relationship = await this.repository.getByPair(managerId, employeeId, companyId);
        return relationship !== null;
    }

    /* HELPERS */

    private async checkRelationship(
        data: HierarchyCreateInput,
        companyId: string,
        tx: Prisma.TransactionClient,
        currentId?: string,
    ) {
        if (data.employeeId === data.subordinateId) {
            throw new ApiError(HttpStatus.CONFLICT, HIERARCHY_MESSAGES.SELF_ASSIGNMENT);
        }

        const [manager, subordinate] = await Promise.all([
            this.employees.getById(data.employeeId, companyId, tx),
            this.employees.getById(data.subordinateId, companyId, tx),
        ]);

        if (!manager || !subordinate) {
            throw new ApiError(HttpStatus.NOT_FOUND, HIERARCHY_MESSAGES.EMPLOYEE_NOT_FOUND);
        }

        const existing = await this.repository.getByPair(
            data.employeeId,
            data.subordinateId,
            companyId,
            tx,
        );
        if (existing && existing.id !== currentId) {
            throw new ApiError(HttpStatus.CONFLICT, HIERARCHY_MESSAGES.ALREADY_EXISTS);
        }

        await this.checkCycle(data.employeeId, data.subordinateId, companyId, tx, currentId);
    }

    private async checkCycle(
        employeeId: string,
        subordinateId: string,
        companyId: string,
        tx: Prisma.TransactionClient,
        currentId?: string,
    ) {
        const relationships = await this.repository.getAllRelationships(companyId, tx);
        const subordinatesByManager = new Map<string, string[]>();

        for (const relationship of relationships) {
            if (relationship.id === currentId) continue;

            const subordinates = subordinatesByManager.get(relationship.employeeId);
            if (subordinates) {
                subordinates.push(relationship.subordinateId);
            } else {
                subordinatesByManager.set(relationship.employeeId, [relationship.subordinateId]);
            }
        }

        const stack = [subordinateId];
        const visited = new Set<string>();

        while (stack.length > 0) {
            const current = stack.pop();
            if (current === undefined || visited.has(current)) continue;

            if (current === employeeId) {
                throw new ApiError(HttpStatus.CONFLICT, HIERARCHY_MESSAGES.CYCLE_DETECTED);
            }

            visited.add(current);
            for (const subordinate of subordinatesByManager.get(current) ?? []) {
                if (!visited.has(subordinate)) stack.push(subordinate);
            }
        }
    }

    private async runInTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
        for (let attempt = 0; attempt < HIERARCHY_TRANSACTION_MAX_ATTEMPTS; attempt++) {
            try {
                return await this.db.$transaction(operation, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                });
            } catch (error: unknown) {
                if (
                    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
                    error.code !== "P2034"
                ) {
                    throw error;
                }
            }
        }

        throw new ApiError(HttpStatus.CONFLICT, HIERARCHY_MESSAGES.TRANSACTION_CONFLICT);
    }
}

export const hierarchyService = new HierarchyService();
