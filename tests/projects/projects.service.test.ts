import { beforeEach, describe, expect, it, vi } from "vitest";

import { PROJECT_MESSAGES } from "../../src/modules/projects/projects.constants.js";
import { ProjectsService } from "../../src/modules/projects/projects.service.js";

import type { ProjectsRepository } from "../../src/modules/projects/projects.repository.js";

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const project = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "CRM",
    description: "Internal CRM project",
    companyId,
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

    it("delegates create and list operations to the repository with the company", async () => {
        repository.create.mockResolvedValue(project);
        repository.getAll.mockResolvedValue([project]);

        await expect(service.create(input, companyId)).resolves.toEqual(project);
        await expect(service.getAll(companyId)).resolves.toEqual([project]);

        expect(repository.create).toHaveBeenCalledWith(input, companyId);
        expect(repository.getAll).toHaveBeenCalledExactlyOnceWith(companyId);
    });

    it("returns a project by ID within the company", async () => {
        await expect(service.getById(project.id, companyId)).resolves.toEqual(project);
        expect(repository.getById).toHaveBeenCalledWith(project.id, companyId);
    });

    it("updates an existing project", async () => {
        const data = { title: "Updated CRM" };
        repository.update.mockResolvedValue({ ...project, ...data });

        await expect(service.update(project.id, companyId, data)).resolves.toEqual({
            ...project,
            ...data,
        });

        expect(repository.getById).toHaveBeenCalledWith(project.id, companyId);
        expect(repository.update).toHaveBeenCalledWith(project.id, companyId, data);
    });

    it("deletes an existing project", async () => {
        repository.delete.mockResolvedValue(project);

        await expect(service.delete(project.id, companyId)).resolves.toEqual(project);

        expect(repository.getById).toHaveBeenCalledWith(project.id, companyId);
        expect(repository.delete).toHaveBeenCalledWith(project.id, companyId);
    });

    it.each(["getById", "update", "delete"] as const)(
        "returns 404 when a project is missing in the company during %s",
        async (operation) => {
            repository.getById.mockResolvedValue(null);

            const result =
                operation === "update"
                    ? service.update(project.id, companyId, { title: "Updated CRM" })
                    : service[operation](project.id, companyId);

            await expect(result).rejects.toMatchObject({
                status: 404,
                message: PROJECT_MESSAGES.NOT_FOUND,
            });
            expect(repository.update).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
        },
    );
});
