import { describe, expect, it } from "vitest";

import {
    projectCreateSchema,
    projectDeleteSchema,
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

    it("validates project deletion confirmation name", () => {
        const valid = projectDeleteSchema.safeParse({ confirmName: "CRM" });
        expect(valid.success).toBe(true);
        if (valid.success) {
            expect(valid.data.confirmName).toBe("CRM");
        }

        const trimmed = projectDeleteSchema.safeParse({ confirmName: "  CRM  " });
        expect(trimmed.success).toBe(true);
        if (trimmed.success) {
            expect(trimmed.data.confirmName).toBe("CRM");
        }

        expect(projectDeleteSchema.safeParse({ confirmName: "" }).success).toBe(false);
        expect(projectDeleteSchema.safeParse({ confirmName: "   " }).success).toBe(false);
        expect(projectDeleteSchema.safeParse({}).success).toBe(false);
        expect(projectDeleteSchema.safeParse({ confirmName: 123 }).success).toBe(false);
        expect(projectDeleteSchema.safeParse({ confirmName: null }).success).toBe(false);
        expect(projectDeleteSchema.safeParse({ confirmName: true }).success).toBe(false);
        expect(projectDeleteSchema.safeParse({ confirmName: "CRM", extra: true }).success).toBe(
            false,
        );
    });
});
