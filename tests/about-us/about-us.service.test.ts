import { beforeEach, describe, expect, it, vi } from "vitest";

import { AboutUsService } from "../../src/modules/about-us/about-us.service.js";

import type { AboutUsRepository } from "../../src/modules/about-us/about-us.repository.js";

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const record = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "About",
    description: "Our story",
    companyId,
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

    it("creates an About Us record in the caller's company", async () => {
        repository.create.mockResolvedValue(record);

        await expect(
            service.create({ title: record.title, description: record.description }, companyId),
        ).resolves.toEqual(record);
        expect(repository.create).toHaveBeenCalledWith(
            { title: record.title, description: record.description },
            companyId,
        );
    });

    it("returns all About Us records of the company", async () => {
        repository.getAll.mockResolvedValue([record]);

        await expect(service.getAll(companyId)).resolves.toEqual([record]);
        expect(repository.getAll).toHaveBeenCalledExactlyOnceWith(companyId);
    });

    it("returns an About Us record by id within the company", async () => {
        repository.getById.mockResolvedValue(record);

        await expect(service.getById(record.id, companyId)).resolves.toEqual(record);
        expect(repository.getById).toHaveBeenCalledWith(record.id, companyId);
    });

    it("throws not found when the record does not exist in the company", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.getById(record.id, companyId)).rejects.toMatchObject({
            status: 404,
        });
    });

    it("updates an existing record", async () => {
        repository.getById.mockResolvedValue(record);
        repository.update.mockResolvedValue({ ...record, title: "Updated" });

        await expect(service.update(record.id, companyId, { title: "Updated" })).resolves.toEqual({
            ...record,
            title: "Updated",
        });
        expect(repository.update).toHaveBeenCalledWith(record.id, companyId, {
            title: "Updated",
        });
    });

    it("does not update a missing record", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(
            service.update(record.id, companyId, { title: "Updated" }),
        ).rejects.toMatchObject({
            status: 404,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("deletes an existing record", async () => {
        repository.getById.mockResolvedValue(record);
        repository.delete.mockResolvedValue(record);

        await expect(service.delete(record.id, companyId)).resolves.toEqual(record);
        expect(repository.delete).toHaveBeenCalledWith(record.id, companyId);
    });

    it("does not delete a missing record", async () => {
        repository.getById.mockResolvedValue(null);

        await expect(service.delete(record.id, companyId)).rejects.toMatchObject({
            status: 404,
        });
        expect(repository.delete).not.toHaveBeenCalled();
    });
});
