import { beforeEach, describe, expect, it, vi } from "vitest";

import { AboutUsService } from "../../src/modules/about-us/about-us.service.js";

import type { AboutUsRepository } from "../../src/modules/about-us/about-us.repository.js";

const record = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "About",
    description: "Our story",
};

describe("AboutUsService", () => {
    let repository: {
        create: ReturnType<typeof vi.fn>;
        getAll: ReturnType<typeof vi.fn>;
        getById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };
    let service: AboutUsService;

    beforeEach(() => {
        repository = {
            create: vi.fn(),
            getAll: vi.fn(),
            getById: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        service = new AboutUsService(repository as unknown as AboutUsRepository);
    });

    it("creates an About Us record", async () => {
        repository.create.mockResolvedValue(record);

        await expect(
            service.create({ title: record.title, description: record.description }),
        ).resolves.toEqual(record);
        expect(repository.create).toHaveBeenCalledWith({
            title: record.title,
            description: record.description,
        });
    });

    it("returns all About Us records", async () => {
        repository.getAll.mockResolvedValue([record]);

        await expect(service.getAll()).resolves.toEqual([record]);
        expect(repository.getAll).toHaveBeenCalledOnce();
    });

    it("returns an About Us record by id", async () => {
        repository.getById.mockResolvedValue(record);

        await expect(service.getById(record.id)).resolves.toEqual(record);
        expect(repository.getById).toHaveBeenCalledWith(record.id);
    });

    it("throws not found when the requested record does not exist", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.getById(record.id)).rejects.toMatchObject({ status: 404 });
    });

    it("updates an existing record", async () => {
        repository.getById.mockResolvedValue(record);
        repository.update.mockResolvedValue({ ...record, title: "Updated" });

        await expect(service.update(record.id, { title: "Updated" })).resolves.toEqual({
            ...record,
            title: "Updated",
        });
        expect(repository.update).toHaveBeenCalledWith(record.id, { title: "Updated" });
    });

    it("does not update a missing record", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.update(record.id, { title: "Updated" })).rejects.toMatchObject({
            status: 404,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("deletes an existing record", async () => {
        repository.getById.mockResolvedValue(record);
        repository.delete.mockResolvedValue(record);

        await expect(service.delete(record.id)).resolves.toEqual(record);
        expect(repository.delete).toHaveBeenCalledWith(record.id);
    });

    it("does not delete a missing record", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.delete(record.id)).rejects.toMatchObject({ status: 404 });
        expect(repository.delete).not.toHaveBeenCalled();
    });
});
