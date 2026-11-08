import { describe, expect, it } from "vitest";

import {
    estimateCreateSchema,
    estimateUpdateSchema,
    estimateListQuerySchema,
} from "../../src/modules/estimates/estimate.schema.js";

describe("estimateCreateSchema", () => {
    it("accepts valid required fields with time and payment omitted", () => {
        const input = {
            name: "Kitchen Renovation",
            description: "Full remodeling of kitchen and dining area.",
        };
        const result = estimateCreateSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe("Kitchen Renovation");
            expect(result.data.description).toBe("Full remodeling of kitchen and dining area.");
        }
    });

    it("accepts valid fields with time and payment", () => {
        const input = {
            name: "Office Setup",
            description: "Furniture assembly and wiring.",
            time: 12.5,
            payment: 1500.5,
        };
        const result = estimateCreateSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.time).toBe(12.5);
            expect(result.data.payment).toBe(1500.5);
        }
    });

    it("accepts null for time and payment", () => {
        const input = {
            name: "Consulting",
            description: "Initial client meeting.",
            time: null,
            payment: null,
        };
        const result = estimateCreateSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.time).toBeNull();
            expect(result.data.payment).toBeNull();
        }
    });

    it("rejects missing name or description", () => {
        expect(estimateCreateSchema.safeParse({ description: "Desc" }).success).toBe(false);
        expect(estimateCreateSchema.safeParse({ name: "Name" }).success).toBe(false);
    });

    it("rejects empty name or description", () => {
        expect(estimateCreateSchema.safeParse({ name: "   ", description: "Desc" }).success).toBe(
            false,
        );
        expect(estimateCreateSchema.safeParse({ name: "Name", description: "   " }).success).toBe(
            false,
        );
    });

    it("rejects name exceeding 100 characters", () => {
        const longName = "a".repeat(101);
        expect(
            estimateCreateSchema.safeParse({ name: longName, description: "Valid desc" }).success,
        ).toBe(false);
    });

    it("rejects description exceeding 1000 characters", () => {
        const longDesc = "a".repeat(1001);
        expect(
            estimateCreateSchema.safeParse({ name: "Valid Name", description: longDesc }).success,
        ).toBe(false);
    });

    it("rejects non-positive time", () => {
        expect(
            estimateCreateSchema.safeParse({
                name: "Name",
                description: "Desc",
                time: 0,
            }).success,
        ).toBe(false);
        expect(
            estimateCreateSchema.safeParse({
                name: "Name",
                description: "Desc",
                time: -5,
            }).success,
        ).toBe(false);
    });

    it("rejects non-positive payment or payment with more than 2 decimal places", () => {
        expect(
            estimateCreateSchema.safeParse({
                name: "Name",
                description: "Desc",
                payment: 0,
            }).success,
        ).toBe(false);
        expect(
            estimateCreateSchema.safeParse({
                name: "Name",
                description: "Desc",
                payment: -10,
            }).success,
        ).toBe(false);
        expect(
            estimateCreateSchema.safeParse({
                name: "Name",
                description: "Desc",
                payment: 10.999,
            }).success,
        ).toBe(false);
    });

    it("rejects extra unrecognized fields", () => {
        expect(
            estimateCreateSchema.safeParse({
                name: "Name",
                description: "Desc",
                createdBy: "user-123",
            }).success,
        ).toBe(false);
    });
});

describe("estimateUpdateSchema", () => {
    it("accepts partial update", () => {
        const result = estimateUpdateSchema.safeParse({ name: "New Name" });
        expect(result.success).toBe(true);
    });

    it("allows clearing time and payment by setting null", () => {
        const result = estimateUpdateSchema.safeParse({ time: null, payment: null });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.time).toBeNull();
            expect(result.data.payment).toBeNull();
        }
    });

    it("rejects empty update object", () => {
        const result = estimateUpdateSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("rejects invalid time or payment values on update", () => {
        expect(estimateUpdateSchema.safeParse({ time: 0 }).success).toBe(false);
        expect(estimateUpdateSchema.safeParse({ payment: -100 }).success).toBe(false);
        expect(estimateUpdateSchema.safeParse({ payment: 12.345 }).success).toBe(false);
    });
});

describe("estimateListQuerySchema", () => {
    it("applies defaults for page, pageSize, sortBy, sortOrder", () => {
        const result = estimateListQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.page).toBe(1);
            expect(result.data.pageSize).toBe(20);
            expect(result.data.sortBy).toBe("createdAt");
            expect(result.data.sortOrder).toBe("desc");
        }
    });

    it("clamps max pageSize to 100", () => {
        const result = estimateListQuerySchema.safeParse({ pageSize: 500 });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.pageSize).toBe(100);
        }
    });

    it("parses string numbers from query params", () => {
        const result = estimateListQuerySchema.safeParse({
            page: "2",
            pageSize: "50",
            search: "Project A",
            sortBy: "name",
            sortOrder: "asc",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.page).toBe(2);
            expect(result.data.pageSize).toBe(50);
            expect(result.data.search).toBe("Project A");
            expect(result.data.sortBy).toBe("name");
            expect(result.data.sortOrder).toBe("asc");
        }
    });
});
