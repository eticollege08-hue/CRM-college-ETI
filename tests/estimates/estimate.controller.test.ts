import { describe, expect, it, vi } from "vitest";

import { EstimateController } from "../../src/modules/estimates/estimate.controller.js";

import type { Request, Response } from "express";
import type { EstimateService } from "../../src/modules/estimates/estimate.service.js";

const id = "550e8400-e29b-41d4-a716-446655440000";
const userId = "550e8400-e29b-41d4-a716-446655440001";

const mockEstimate = {
    id,
    name: "Design Estimate",
    description: "UI/UX design specs",
    time: 20,
    payment: 1000,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
};

describe("EstimateController", () => {
    it("creates an estimate and returns 201 with success message", async () => {
        const create = vi.fn().mockResolvedValue(mockEstimate);
        const controller = new EstimateController({ create } as unknown as EstimateService);

        const req = {
            body: { name: "Design Estimate", description: "UI/UX design specs" },
            user: { userId, role: "OWNER" },
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.create(req, res as unknown as Response);

        expect(create).toHaveBeenCalledWith(req.body, userId);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Estimate created successfully.",
            estimate: mockEstimate,
        });
    });

    it("gets estimate by id and returns 200", async () => {
        const getById = vi.fn().mockResolvedValue(mockEstimate);
        const controller = new EstimateController({ getById } as unknown as EstimateService);

        const req = { params: { id } } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.getById(req, res as unknown as Response);

        expect(getById).toHaveBeenCalledWith(id);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            estimate: mockEstimate,
        });
    });

    it("gets paginated estimates list and returns 200 with meta", async () => {
        const listData = {
            estimates: [mockEstimate],
            meta: { totalCount: 1, page: 1, pageSize: 20 },
        };
        const getList = vi.fn().mockResolvedValue(listData);
        const controller = new EstimateController({ getList } as unknown as EstimateService);

        const req = { query: { page: "1", pageSize: "20" } } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.getList(req, res as unknown as Response);

        expect(getList).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" }),
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            estimates: [mockEstimate],
            meta: listData.meta,
        });
    });

    it("updates an estimate and returns 200 with success message", async () => {
        const updated = { ...mockEstimate, name: "Renamed Estimate" };
        const update = vi.fn().mockResolvedValue(updated);
        const controller = new EstimateController({ update } as unknown as EstimateService);

        const req = {
            params: { id },
            body: { name: "Renamed Estimate" },
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.update(req, res as unknown as Response);

        expect(update).toHaveBeenCalledWith(id, req.body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Estimate updated successfully.",
            estimate: updated,
        });
    });

    it("deletes an estimate and returns 200 with success message", async () => {
        const remove = vi.fn().mockResolvedValue(undefined);
        const controller = new EstimateController({ delete: remove } as unknown as EstimateService);

        const req = { params: { id } } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.delete(req, res as unknown as Response);

        expect(remove).toHaveBeenCalledWith(id);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Estimate deleted successfully.",
        });
    });
});
