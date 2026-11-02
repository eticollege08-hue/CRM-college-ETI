import { beforeEach, describe, expect, it, vi } from "vitest";

import { PROJECT_MESSAGES } from "../../src/modules/projects/projects.constants.js";
import { ProjectsService } from "../../src/modules/projects/projects.service.js";

import type { ProjectsRepository } from "../../src/modules/projects/projects.repository.js";

const project = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "CRM",
    description: "Internal CRM project",
};
const input = { title: project.title, description: project.description };

describe("ProjectsService", () => {
    const repository = {
        create: vi.fn<ProjectsRepository["create"]>(),
        getAll: vi.fn<ProjectsRepository["getAll"]>(),
        getById: vi.fn<ProjectsRepository["getById"]>(),
        update: vi.fn<ProjectsRepository["update"]>(),
        delete: vi.fn<ProjectsRepository["delete"]>(),
    };
    const service = new ProjectsService(repository as unknown as ProjectsRepository);

    beforeEach(() => {
        vi.resetAllMocks();
        repository.getById.mockResolvedValue(project);
    });

    it("delegates create and list operations to the repository", async () => {
        repository.create.mockResolvedValue(project);
        repository.getAll.mockResolvedValue([project]);

        await expect(service.create(input)).resolves.toEqual(project);
        await expect(service.getAll()).resolves.toEqual([project]);

        expect(repository.create).toHaveBeenCalledWith(input);
        expect(repository.getAll).toHaveBeenCalledOnce();
    });

    it("returns a project by ID", async () => {
        await expect(service.getById(project.id)).resolves.toEqual(project);
        expect(repository.getById).toHaveBeenCalledWith(project.id);
    });

    it("updates an existing project", async () => {
        const data = { title: "Updated CRM" };
        repository.update.mockResolvedValue({ ...project, ...data });

        await expect(service.update(project.id, data)).resolves.toEqual({ ...project, ...data });

        expect(repository.getById).toHaveBeenCalledWith(project.id);
        expect(repository.update).toHaveBeenCalledWith(project.id, data);
    });

    it("deletes an existing project", async () => {
        repository.delete.mockResolvedValue(project);

        await expect(service.delete(project.id)).resolves.toEqual(project);

        expect(repository.getById).toHaveBeenCalledWith(project.id);
        expect(repository.delete).toHaveBeenCalledWith(project.id);
    });

    it.each(["getById", "update", "delete"] as const)(
        "returns 404 when a project is missing during %s",
        async (operation) => {
            repository.getById.mockResolvedValue(null);

            const result =
                operation === "update"
                    ? service.update(project.id, { title: "Updated CRM" })
                    : service[operation](project.id);

            await expect(result).rejects.toMatchObject({
                status: 404,
                message: PROJECT_MESSAGES.NOT_FOUND,
            });
            expect(repository.update).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
        },
    );
});
