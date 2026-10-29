import { beforeEach, describe, expect, it, vi } from "vitest";

import { aboutUsPageService } from "../../src/modules/about-us-ssr/about-us-ssr.service.js";

const { getAll } = vi.hoisted(() => ({ getAll: vi.fn() }));

vi.mock("#modules/about-us/about-us.service.js", () => ({
    aboutUsService: { getAll },
}));

const records = [
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "About",
        description: "Our story",
    },
];

describe("aboutUsPageService", () => {
    beforeEach(() => {
        getAll.mockReset();
    });

    it("returns all records for the About Us page", async () => {
        getAll.mockResolvedValue(records);

        await expect(aboutUsPageService.getPageData()).resolves.toEqual({
            aboutUsRecords: records,
        });
        expect(getAll).toHaveBeenCalledOnce();
    });

    it("forwards errors from the About Us service", async () => {
        const error = new Error("About Us lookup failed");
        getAll.mockRejectedValue(error);

        await expect(aboutUsPageService.getPageData()).rejects.toBe(error);
    });
});
