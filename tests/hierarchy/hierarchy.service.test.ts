import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    HIERARCHY_MESSAGES,
    HIERARCHY_TRANSACTION_MAX_ATTEMPTS,
} from "../../src/modules/hierarchy/hierarchy.constants.js";
import { HierarchyService } from "../../src/modules/hierarchy/hierarchy.service.js";

import type { EmployeeRepository } from "../../src/modules/employees/employee.repository.js";
import type { HierarchyRepository } from "../../src/modules/hierarchy/hierarchy.repository.js";

const { tx, transaction } = vi.hoisted(() => ({ tx: {}, transaction: vi.fn() }));
vi.mock("#config/prisma.config.js", () => ({ default: { $transaction: transaction } }));

const hierarchy = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    employeeId: "550e8400-e29b-41d4-a716-446655440001",
    subordinateId: "550e8400-e29b-41d4-a716-446655440002",
};
const input = { employeeId: hierarchy.employeeId, subordinateId: hierarchy.subordinateId };
const edge = (
    employeeId: string,
    subordinateId: string,
    id = `${employeeId}-${subordinateId}`,
) => ({
    id,
    employeeId,
    subordinateId,
});

describe("HierarchyService", () => {
    const repository = {
        create: vi.fn<HierarchyRepository["create"]>(),
        getAll: vi.fn<HierarchyRepository["getAll"]>(),
        getAllRelationships: vi.fn<HierarchyRepository["getAllRelationships"]>(),
        getById: vi.fn<HierarchyRepository["getById"]>(),
        getByPair: vi.fn<HierarchyRepository["getByPair"]>(),
        update: vi.fn<HierarchyRepository["update"]>(),
        delete: vi.fn<HierarchyRepository["delete"]>(),
    };
    const employees = { getById: vi.fn<EmployeeRepository["getById"]>() };
    const service = new HierarchyService(
        repository as unknown as HierarchyRepository,
        employees as unknown as EmployeeRepository,
    );

    beforeEach(() => {
        vi.resetAllMocks();
        transaction.mockImplementation(async (operation: (client: typeof tx) => Promise<unknown>) =>
            operation(tx),
        );
        repository.getById.mockResolvedValue(hierarchy);
        repository.getByPair.mockResolvedValue(null);
        repository.getAllRelationships.mockResolvedValue([]);
        employees.getById.mockImplementation(async (id) => ({
            id,
            fullName: null,
            imageId: null,
            level: null,
            position: null,
        }));
    });

    it("delegates all five operations and returns their results", async () => {
        repository.create.mockResolvedValue(hierarchy);
        repository.getAll.mockResolvedValue([hierarchy]);
        repository.update.mockResolvedValue(hierarchy);
        repository.delete.mockResolvedValue(hierarchy);

        await expect(service.create(input)).resolves.toEqual(hierarchy);
        await expect(service.getAll()).resolves.toEqual([hierarchy]);
        await expect(service.getById(hierarchy.id)).resolves.toEqual(hierarchy);
        await expect(service.update(hierarchy.id, input)).resolves.toEqual(hierarchy);
        await expect(service.delete(hierarchy.id)).resolves.toEqual(hierarchy);

        expect(repository.create).toHaveBeenCalledWith(input, tx);
        expect(repository.getAll).toHaveBeenCalledOnce();
        expect(repository.getById).toHaveBeenCalledWith(hierarchy.id, tx);
        expect(repository.update).toHaveBeenCalledWith(hierarchy.id, input, tx);
        expect(repository.delete).toHaveBeenCalledWith(hierarchy.id, tx);
    });

    it.each(["getById", "update", "delete"] as const)(
        "returns 404 for a missing relationship during %s",
        async (operation) => {
            repository.getById.mockResolvedValue(null);

            const result =
                operation === "update"
                    ? service.update(hierarchy.id, input)
                    : service[operation](hierarchy.id);

            await expect(result).rejects.toMatchObject({
                status: 404,
                message: HIERARCHY_MESSAGES.NOT_FOUND,
            });
            expect(repository.update).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
        },
    );

    it.each(["create", "update"] as const)(
        "returns 409 when the pair already exists during %s",
        async (operation) => {
            repository.getByPair.mockResolvedValue({ ...hierarchy, id: "another-relationship" });

            const result =
                operation === "create"
                    ? service.create(input)
                    : service.update(hierarchy.id, input);

            await expect(result).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.ALREADY_EXISTS,
            });
            expect(repository.create).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        },
    );

    it.each(["create", "update"] as const)(
        "rejects self-assignment during %s before querying employees",
        async (operation) => {
            const data = { employeeId: input.employeeId, subordinateId: input.employeeId };

            const result =
                operation === "create" ? service.create(data) : service.update(hierarchy.id, data);

            await expect(result).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.SELF_ASSIGNMENT,
            });
            expect(employees.getById).not.toHaveBeenCalled();
            expect(repository.getByPair).not.toHaveBeenCalled();
            expect(repository.create).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        },
    );

    it.each([{ employeeId: input.subordinateId }, { subordinateId: input.employeeId }])(
        "rejects self-assignment in a partial update: %j",
        async (data) => {
            await expect(service.update(hierarchy.id, data)).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.SELF_ASSIGNMENT,
            });
            expect(repository.update).not.toHaveBeenCalled();
        },
    );

    it.each(["create", "update"] as const)(
        "returns 404 when either employee is missing during %s",
        async (operation) => {
            for (const missingId of [input.employeeId, input.subordinateId]) {
                employees.getById.mockImplementation(async (id) =>
                    id === missingId
                        ? null
                        : { id, fullName: null, imageId: null, level: null, position: null },
                );

                const result =
                    operation === "create"
                        ? service.create(input)
                        : service.update(hierarchy.id, input);

                await expect(result).rejects.toMatchObject({
                    status: 404,
                    message: HIERARCHY_MESSAGES.EMPLOYEE_NOT_FOUND,
                });
            }
            expect(repository.create).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        },
    );

    it.each(["employeeId", "subordinateId"] as const)(
        "uses the saved value of the other field when updating %s",
        async (field) => {
            const changes = { [field]: "550e8400-e29b-41d4-a716-446655440003" };
            const updated = { ...hierarchy, ...changes };
            repository.update.mockResolvedValue(updated);

            await expect(service.update(hierarchy.id, changes)).resolves.toEqual(updated);

            expect(repository.getByPair).toHaveBeenCalledWith(
                updated.employeeId,
                updated.subordinateId,
                tx,
            );
            expect(employees.getById).toHaveBeenCalledWith(updated.employeeId, tx);
            expect(employees.getById).toHaveBeenCalledWith(updated.subordinateId, tx);
        },
    );

    it("allows updating the current relationship without changing its pair", async () => {
        repository.getByPair.mockResolvedValue(hierarchy);
        repository.update.mockResolvedValue(hierarchy);

        await expect(service.update(hierarchy.id, {})).resolves.toEqual(hierarchy);
        expect(repository.update).toHaveBeenCalledWith(hierarchy.id, {}, tx);
    });

    it("propagates unexpected repository errors", async () => {
        const error = new Error("Unexpected failure");
        repository.create.mockRejectedValue(error);

        await expect(service.create(input)).rejects.toBe(error);
    });

    describe("transactions", () => {
        const conflict = new Prisma.PrismaClientKnownRequestError("Write conflict", {
            code: "P2034",
            clientVersion: "5.22.0",
        });

        it("uses Serializable and shares the transaction across all create queries", async () => {
            repository.create.mockResolvedValue(hierarchy);

            await service.create(input);

            expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            });
            expect(employees.getById).toHaveBeenCalledWith(input.employeeId, tx);
            expect(employees.getById).toHaveBeenCalledWith(input.subordinateId, tx);
            expect(repository.getByPair).toHaveBeenCalledWith(
                input.employeeId,
                input.subordinateId,
                tx,
            );
            expect(repository.getAllRelationships).toHaveBeenCalledWith(tx);
            expect(repository.create).toHaveBeenCalledWith(input, tx);
        });

        it.each(["create", "update"] as const)(
            "repeats all checks after a write conflict during %s",
            async (operation) => {
                repository[operation].mockRejectedValueOnce(conflict).mockResolvedValue(hierarchy);

                const result =
                    operation === "create"
                        ? service.create(input)
                        : service.update(hierarchy.id, input);

                await expect(result).resolves.toEqual(hierarchy);
                expect(transaction).toHaveBeenCalledTimes(2);
                expect(repository.getByPair).toHaveBeenCalledTimes(2);
                expect(repository.getAllRelationships).toHaveBeenCalledTimes(2);
                expect(employees.getById).toHaveBeenCalledTimes(4);
                if (operation === "update") {
                    expect(repository.getById).toHaveBeenCalledTimes(2);
                }
            },
        );

        it("rejects a cycle found when rereading the graph after a conflict", async () => {
            repository.create.mockRejectedValueOnce(conflict);
            repository.getAllRelationships
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([edge(input.subordinateId, input.employeeId)]);

            await expect(service.create(input)).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.CYCLE_DETECTED,
            });
            expect(transaction).toHaveBeenCalledTimes(2);
            expect(repository.create).toHaveBeenCalledOnce();
        });

        it("limits retries and returns 409 when serialization conflicts persist", async () => {
            transaction.mockRejectedValue(conflict);

            await expect(service.create(input)).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.TRANSACTION_CONFLICT,
            });
            expect(transaction).toHaveBeenCalledTimes(HIERARCHY_TRANSACTION_MAX_ATTEMPTS);
        });

        it("does not retry domain errors", async () => {
            await expect(
                service.create({ employeeId: input.employeeId, subordinateId: input.employeeId }),
            ).rejects.toMatchObject({ status: 409 });
            expect(transaction).toHaveBeenCalledOnce();
        });

        it("does not retry unexpected errors", async () => {
            const error = new Error("Transaction failed");
            transaction.mockRejectedValue(error);

            await expect(service.create(input)).rejects.toBe(error);
            expect(transaction).toHaveBeenCalledOnce();
        });
    });

    describe("cycle detection", () => {
        const cyclicPaths = [
            {
                name: "direct reverse relationship",
                edges: [edge(input.subordinateId, input.employeeId)],
            },
            {
                name: "a path through several employees",
                edges: [
                    edge(input.subordinateId, "middle-1"),
                    edge("middle-1", "middle-2"),
                    edge("middle-2", input.employeeId),
                ],
            },
            {
                name: "one of several branches with shared subordinates",
                edges: [
                    edge(input.subordinateId, "left"),
                    edge(input.subordinateId, "right"),
                    edge("left", "shared"),
                    edge("right", "shared"),
                    edge("shared", input.employeeId),
                    edge(input.subordinateId, "dead-end"),
                ],
            },
        ];

        it.each(cyclicPaths)("rejects create with $name", async ({ edges }) => {
            repository.getAllRelationships.mockResolvedValue(edges);

            await expect(service.create(input)).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.CYCLE_DETECTED,
            });
            expect(repository.create).not.toHaveBeenCalled();
        });

        it.each(["employeeId", "subordinateId"] as const)(
            "rejects a cycle when a partial update changes %s",
            async (field) => {
                const changes = { [field]: "new-employee" };
                const updated = { ...hierarchy, ...changes };
                repository.getAllRelationships.mockResolvedValue([
                    hierarchy,
                    edge(updated.subordinateId, "middle"),
                    edge("middle", updated.employeeId),
                ]);

                await expect(service.update(hierarchy.id, changes)).rejects.toMatchObject({
                    status: 409,
                    message: HIERARCHY_MESSAGES.CYCLE_DETECTED,
                });
                expect(repository.update).not.toHaveBeenCalled();
            },
        );

        it("excludes the replaced relationship when reversing an isolated edge", async () => {
            repository.getAllRelationships.mockResolvedValue([hierarchy]);
            const reversed = {
                employeeId: input.subordinateId,
                subordinateId: input.employeeId,
            };
            repository.update.mockResolvedValue({ id: hierarchy.id, ...reversed });

            await expect(service.update(hierarchy.id, reversed)).resolves.toEqual({
                id: hierarchy.id,
                ...reversed,
            });
            expect(repository.update).toHaveBeenCalledWith(hierarchy.id, reversed, tx);
        });

        it("allows multiple managers, shared descendants and an existing forward path", async () => {
            repository.getAllRelationships.mockResolvedValue([
                edge(input.employeeId, "middle"),
                edge("middle", input.subordinateId),
                edge("another-manager", input.subordinateId),
                edge(input.subordinateId, "left"),
                edge(input.subordinateId, "right"),
                edge("left", "shared"),
                edge("right", "shared"),
            ]);
            repository.create.mockResolvedValue(hierarchy);

            await expect(service.create(input)).resolves.toEqual(hierarchy);
        });

        it("finishes even if the reachable graph already contains an unrelated cycle", async () => {
            repository.getAllRelationships.mockResolvedValue([
                edge(input.subordinateId, "other"),
                edge("other", input.subordinateId),
            ]);
            repository.create.mockResolvedValue(hierarchy);

            await expect(service.create(input)).resolves.toEqual(hierarchy);
        });

        it("checks a deep hierarchy without recursion", async () => {
            const edges = Array.from({ length: 15_000 }, (_, index) =>
                edge(String(index), String(index + 1)),
            );
            repository.getAllRelationships.mockResolvedValue([
                edge(input.subordinateId, "0"),
                ...edges,
                edge("15000", input.employeeId),
            ]);

            await expect(service.create(input)).rejects.toMatchObject({
                status: 409,
                message: HIERARCHY_MESSAGES.CYCLE_DETECTED,
            });
            expect(repository.getAllRelationships).toHaveBeenCalledOnce();
            expect(repository.create).not.toHaveBeenCalled();
        });
    });
});
