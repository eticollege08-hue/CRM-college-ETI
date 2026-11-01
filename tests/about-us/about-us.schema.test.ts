import { describe, expect, it } from "vitest";

import {
    aboutUsCreateSchema,
    aboutUsUpdateSchema,
} from "../../src/modules/about-us/about-us.schema.js";

describe("About Us schemas", () => {
    it("requires non-empty title and description when creating a record", () => {
        expect(
            aboutUsCreateSchema.safeParse({ title: "About", description: "Our story" }).success,
        ).toBe(true);
        expect(
            aboutUsCreateSchema.safeParse({ title: " ", description: "Our story" }).success,
        ).toBe(false);
        expect(aboutUsCreateSchema.safeParse({ title: "About" }).success).toBe(false);
    });

    it("allows a non-empty partial update and rejects an empty update", () => {
        expect(aboutUsUpdateSchema.safeParse({ title: "Updated title" }).success).toBe(true);
        expect(aboutUsUpdateSchema.safeParse({}).success).toBe(false);
        expect(aboutUsUpdateSchema.safeParse({ description: " " }).success).toBe(false);
    });
});
