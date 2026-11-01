import { describe, expect, it } from "vitest";

import {
    projectCreateSchema,
    projectUpdateSchema,
} from "../../src/modules/projects/projects.schema.js";

describe("project schemas", () => {
    it("requires a non-empty title and description when creating a project", () => {
        expect(
            projectCreateSchema.safeParse({ title: "CRM", description: "Internal CRM" }).success,
        ).toBe(true);
        expect(projectCreateSchema.safeParse({ title: "CRM" }).success).toBe(false);
        expect(
            projectCreateSchema.safeParse({ title: " ", description: "Description" }).success,
        ).toBe(false);
    });

    it("accepts a partial update with at least one non-empty field", () => {
        expect(projectUpdateSchema.safeParse({ title: "Updated title" }).success).toBe(true);
        expect(projectUpdateSchema.safeParse({ description: "Updated description" }).success).toBe(
            true,
        );
        expect(projectUpdateSchema.safeParse({}).success).toBe(false);
        expect(projectUpdateSchema.safeParse({ description: " " }).success).toBe(false);
        expect(projectUpdateSchema.safeParse({ unexpected: "field" }).success).toBe(false);
    });
});
