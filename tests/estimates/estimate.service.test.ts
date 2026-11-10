import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateService } from "../../src/modules/estimates/estimate.service.js";

import type { EstimateRepository } from "../../src/modules/estimates/estimate.repository.js";

const mockEstimate = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Initial Proposal",
    description: "Detailed proposal document.",
    time: 10,
    payment: 1200 as unknown,
    createdBy: "550e8400-e29b-41d4-a716-446655440001",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
};

describe("EstimateService", () => {
    let repository: {
        create: ReturnType<typeof vi.fn>;
        getById: ReturnType<typeof vi.fn>;
        getList: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        softDelete: ReturnType<typeof vi.fn>;
    };
    let service: EstimateService;

    beforeEach(() => {
        repository = {
            create: vi.fn(),
            getById: vi.fn(),
            getList: vi.fn(),
            update: vi.fn(),
            softDelete: vi.fn(),
        };
        service = new EstimateService(repository as unknown as EstimateRepository);
    });

    describe("create", () => {
        it("creates an estimate assigning createdBy from authenticated actor", async () => {
            const input = {
                name: "New Estimate",
                description: "Description",
                time: 5,
                payment: 500,
            };
            const actorId = "user-123";
            repository.create.mockResolvedValue({ ...mockEstimate, ...input, createdBy: actorId });

            const result = await service.create(input, actorId);

            expect(repository.create).toHaveBeenCalledWith({
                ...input,
                createdBy: actorId,
            });
            expect(result.createdBy).toBe(actorId);
        });
    });

    describe("getById", () => {
        it("returns an estimate when found", async () => {
            repository.getById.mockResolvedValue(mockEstimate);

            const result = await service.getById(mockEstimate.id);

            expect(repository.getById).toHaveBeenCalledWith(mockEstimate.id);
            expect(result).toEqual(mockEstimate);
        });

        it("throws 404 when estimate not found or deleted", async () => {
            repository.getById.mockResolvedValue(null);

            await expect(service.getById("non-existent")).rejects.toMatchObject({
                status: 404,
                message: "Estimate not found.",
            });
        });
    });

    describe("getList", () => {
        it("delegates query parameters to repository getList", async () => {
            const query = {
                page: 1,
                pageSize: 20,
                sortBy: "createdAt" as const,
                sortOrder: "desc" as const,
            };
            const mockListResult = {
                estimates: [mockEstimate],
                meta: { totalCount: 1, page: 1, pageSize: 20 },
            };
            repository.getList.mockResolvedValue(mockListResult);

            const result = await service.getList(query);

            expect(repository.getList).toHaveBeenCalledWith(query);
            expect(result).toEqual(mockListResult);
        });
    });

    describe("update", () => {
        it("updates editable fields when estimate exists", async () => {
            repository.getById.mockResolvedValue(mockEstimate);
            const updateInput = { name: "Updated Name", time: null };
            const updatedEstimate = { ...mockEstimate, ...updateInput };
            repository.update.mockResolvedValue(updatedEstimate);

            const result = await service.update(mockEstimate.id, updateInput);

            expect(repository.getById).toHaveBeenCalledWith(mockEstimate.id);
            expect(repository.update).toHaveBeenCalledWith(mockEstimate.id, updateInput);
            expect(result.name).toBe("Updated Name");
        });

        it("throws 404 when updating non-existent estimate", async () => {
            repository.getById.mockResolvedValue(null);

            await expect(
                service.update("non-existent", { name: "New Name" }),
            ).rejects.toMatchObject({
                status: 404,
            });
            expect(repository.update).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("performs soft delete when estimate exists", async () => {
            repository.getById.mockResolvedValue(mockEstimate);
            repository.softDelete.mockResolvedValue({
                ...mockEstimate,
                deletedAt: new Date(),
            });

            await service.delete(mockEstimate.id);

            expect(repository.getById).toHaveBeenCalledWith(mockEstimate.id);
            expect(repository.softDelete).toHaveBeenCalledWith(mockEstimate.id);
        });

        it("throws 404 when deleting non-existent estimate", async () => {
            repository.getById.mockResolvedValue(null);

            await expect(service.delete("non-existent")).rejects.toMatchObject({
                status: 404,
            });
            expect(repository.softDelete).not.toHaveBeenCalled();
        });
    });
});
