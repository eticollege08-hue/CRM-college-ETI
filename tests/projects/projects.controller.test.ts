import { describe, expect, it, vi } from "vitest";

import { PROJECT_MESSAGES } from "../../src/modules/projects/projects.constants.js";
import { ProjectsController } from "../../src/modules/projects/projects.controller.js";

import type { Request, Response } from "express";
import type { ProjectsService } from "../../src/modules/projects/projects.service.js";

const id = "550e8400-e29b-41d4-a716-446655440000";
const userId = "550e8400-e29b-41d4-a716-446655440001";
const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const user = { userId, role: "OWNER", companyId, exp: 2000000000 };

const mockProject = {
    id,
    title: "CRM",
    description: "Internal CRM",
    companyId,
};

describe("ProjectsController", () => {
    it("creates a project and returns 201 with success message", async () => {
        const create = vi.fn().mockResolvedValue(mockProject);
        const controller = new ProjectsController({ create } as unknown as ProjectsService);

        const req = {
            body: { title: "CRM", description: "Internal CRM" },
            user,
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.create(req, res as unknown as Response);

        expect(create).toHaveBeenCalledWith(req.body, companyId);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: PROJECT_MESSAGES.CREATED,
            project: mockProject,
        });
    });

    it("gets all projects and returns 200", async () => {
        const getAll = vi.fn().mockResolvedValue([mockProject]);
        const controller = new ProjectsController({ getAll } as unknown as ProjectsService);

        const req = { user } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.getAll(req, res as unknown as Response);

        expect(getAll).toHaveBeenCalledWith(companyId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, projects: [mockProject] });
    });

    it("gets project by id and returns 200", async () => {
        const getById = vi.fn().mockResolvedValue(mockProject);
        const controller = new ProjectsController({ getById } as unknown as ProjectsService);

        const req = { params: { id }, user } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.getById(req, res as unknown as Response);

        expect(getById).toHaveBeenCalledWith(id, companyId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, project: mockProject });
    });

    it("updates project and returns 200 with success message", async () => {
        const update = vi.fn().mockResolvedValue(mockProject);
        const controller = new ProjectsController({ update } as unknown as ProjectsService);

        const req = {
            params: { id },
            body: { title: "New Title" },
            user,
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.update(req, res as unknown as Response);

        expect(update).toHaveBeenCalledWith(id, companyId, req.body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: PROJECT_MESSAGES.UPDATED,
            project: mockProject,
        });
    });

    it("deletes a project with confirmName and returns 200 with success message", async () => {
        const remove = vi.fn().mockResolvedValue(mockProject);
        const controller = new ProjectsController({ delete: remove } as unknown as ProjectsService);

        const req = {
            params: { id },
            body: { confirmName: "CRM" },
            user,
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await controller.delete(req, res as unknown as Response);

        expect(remove).toHaveBeenCalledWith(id, companyId, "CRM");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: PROJECT_MESSAGES.DELETED,
        });
    });

    it("rejects with 401 when user is unauthenticated", async () => {
        const remove = vi.fn();
        const controller = new ProjectsController({ delete: remove } as unknown as ProjectsService);

        const req = { params: { id }, body: { confirmName: "CRM" } } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

        await expect(controller.delete(req, res as unknown as Response)).rejects.toMatchObject({
            status: 401,
        });
        expect(remove).not.toHaveBeenCalled();
    });
});
