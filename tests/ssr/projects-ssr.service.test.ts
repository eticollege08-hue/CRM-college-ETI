import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsPageService } from "../../src/modules/projects-ssr/projects-ssr.service.js";

const { getAll } = vi.hoisted(() => ({ getAll: vi.fn() }));

vi.mock("#modules/projects/projects.service.js", () => ({
    projectsService: { getAll },
}));

const companyId = "550e8400-e29b-41d4-a716-4466554400c1";
const projects = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "CRM",
        description: "Internal CRM project",
        companyId,
    },
];

describe("projectsPageService", () => {
    beforeEach(() => {
        getAll.mockReset();
    });

    it("returns the company's projects for the SSR page", async () => {
        getAll.mockResolvedValue(projects);

        const result = await projectsPageService.getPageData(companyId);

        expect(getAll).toHaveBeenCalledExactlyOnceWith(companyId);
        expect(result).toEqual({ projects });
    });

    it("forwards errors from the projects service", async () => {
        const error = new Error("Project lookup failed");
        getAll.mockRejectedValue(error);

        await expect(projectsPageService.getPageData(companyId)).rejects.toBe(error);
    });
});
