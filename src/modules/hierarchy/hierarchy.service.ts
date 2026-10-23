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

    async create(data: HierarchyCreateInput) {
        return await this.runInTransaction(async (tx) => {
            await this.checkRelationship(data, tx);
            return await this.repository.create(data, tx);
        });
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: string, tx: Prisma.TransactionClient = this.db) {
        const hierarchy = await this.repository.getById(id, tx);

        if (!hierarchy) {
            throw new ApiError(HttpStatus.NOT_FOUND, HIERARCHY_MESSAGES.NOT_FOUND);
        }

        return hierarchy;
    }

    async update(id: string, data: HierarchyUpdateInput) {
        return await this.runInTransaction(async (tx) => {
            const hierarchy = await this.getById(id, tx);

            await this.checkRelationship(
                {
                    employeeId: data.employeeId ?? hierarchy.employeeId,
                    subordinateId: data.subordinateId ?? hierarchy.subordinateId,
                },
                tx,
                id,
            );

            return await this.repository.update(id, data, tx);
        });
    }

    async delete(id: string) {
        return await this.runInTransaction(async (tx) => {
            await this.getById(id, tx);
            return await this.repository.delete(id, tx);
        });
    }

    private async checkRelationship(
        data: HierarchyCreateInput,
        tx: Prisma.TransactionClient,
        currentId?: string,
    ) {
        if (data.employeeId === data.subordinateId) {
            throw new ApiError(HttpStatus.CONFLICT, HIERARCHY_MESSAGES.SELF_ASSIGNMENT);
        }

        const [manager, subordinate] = await Promise.all([
            this.employees.getById(data.employeeId, tx),
            this.employees.getById(data.subordinateId, tx),
        ]);

        if (!manager || !subordinate) {
            throw new ApiError(HttpStatus.NOT_FOUND, HIERARCHY_MESSAGES.EMPLOYEE_NOT_FOUND);
        }

        const existing = await this.repository.getByPair(data.employeeId, data.subordinateId, tx);
        if (existing && existing.id !== currentId) {
            throw new ApiError(HttpStatus.CONFLICT, HIERARCHY_MESSAGES.ALREADY_EXISTS);
        }

        await this.checkCycle(data.employeeId, data.subordinateId, tx, currentId);
    }

    private async checkCycle(
        employeeId: string,
        subordinateId: string,
        tx: Prisma.TransactionClient,
        currentId?: string,
    ) {
        const relationships = await this.repository.getAllRelationships(tx);
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
