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
        transaction: vi.fn<ProjectsRepository["transaction"]>(),
    };
    const service = new ProjectsService(repository as unknown as ProjectsRepository);

    beforeEach(() => {
        vi.resetAllMocks();
        repository.getById.mockResolvedValue(project);
        repository.transaction.mockImplementation(async (cb) =>
            cb(repository as unknown as Parameters<typeof cb>[0]),
        );
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

    it("deletes an existing project when confirmName matches exactly in the same transaction", async () => {
        repository.delete.mockResolvedValue(project);

        await expect(service.delete(project.id, companyId, "CRM")).resolves.toEqual(project);

        expect(repository.transaction).toHaveBeenCalledOnce();
        expect(repository.getById).toHaveBeenCalledWith(project.id, companyId, expect.anything());
        expect(repository.delete).toHaveBeenCalledWith(project.id, companyId, expect.anything());
    });

    it("deletes an existing project when confirmName has leading or trailing spaces", async () => {
        repository.delete.mockResolvedValue(project);

        await expect(service.delete(project.id, companyId, "  CRM  ")).resolves.toEqual(project);

        expect(repository.transaction).toHaveBeenCalledOnce();
        expect(repository.delete).toHaveBeenCalledWith(project.id, companyId, expect.anything());
    });

    it("rejects deletion with 400 if confirmName is missing or empty without calling delete", async () => {
        await expect(service.delete(project.id, companyId, "")).rejects.toMatchObject({
            status: 400,
            message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED,
        });

        await expect(service.delete(project.id, companyId, "   ")).rejects.toMatchObject({
            status: 400,
            message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED,
        });

        await expect(
            service.delete(project.id, companyId, null as unknown as string),
        ).rejects.toMatchObject({
            status: 400,
            message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED,
        });

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it("rejects deletion with 400 if confirmName does not match, without revealing project name", async () => {
        const errPromise = service.delete(project.id, companyId, "Different Name");
        await expect(errPromise).rejects.toMatchObject({
            status: 400,
            message: PROJECT_MESSAGES.CONFIRM_NAME_MISMATCH,
        });
        await errPromise.catch((err) => {
            expect(err.message).not.toContain(project.title);
            expect(PROJECT_MESSAGES.CONFIRM_NAME_MISMATCH).not.toContain(project.title);
        });

        // Case-sensitive check
        await expect(service.delete(project.id, companyId, "crm")).rejects.toMatchObject({
            status: 400,
            message: PROJECT_MESSAGES.CONFIRM_NAME_MISMATCH,
        });

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when project does not exist during delete", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.delete(project.id, companyId, "CRM")).rejects.toMatchObject({
            status: 404,
            message: PROJECT_MESSAGES.NOT_FOUND,
        });

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it.each(["getById", "update"] as const)(
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
