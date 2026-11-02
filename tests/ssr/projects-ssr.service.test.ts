import { beforeEach, describe, expect, it, vi } from "vitest";

import { projectsPageService } from "../../src/modules/projects-ssr/projects-ssr.service.js";

const { getAll } = vi.hoisted(() => ({ getAll: vi.fn() }));

vi.mock("#modules/projects/projects.service.js", () => ({
    projectsService: { getAll },
}));

const projects = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "CRM",
        description: "Internal CRM project",
    },
];

describe("projectsPageService", () => {
    beforeEach(() => {
        getAll.mockReset();
    });

    it("returns projects for the SSR page", async () => {
        getAll.mockResolvedValue(projects);

        const result = await projectsPageService.getPageData();

        expect(getAll).toHaveBeenCalledOnce();
        expect(result).toEqual({ projects });
    });

    it("forwards errors from the projects service", async () => {
        const error = new Error("Project lookup failed");
        getAll.mockRejectedValue(error);

        await expect(projectsPageService.getPageData()).rejects.toBe(error);
    });
});
