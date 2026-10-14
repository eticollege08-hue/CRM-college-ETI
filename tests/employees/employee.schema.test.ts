import { describe, expect, it } from "vitest";

import {
    employeeCreateSchema,
    employeeUpdateSchema,
} from "../../src/modules/employees/employee.schema.js";

describe("employee schemas", () => {
    it("allows clearing imageId in an update", () => {
        expect(employeeUpdateSchema.parse({ imageId: null })).toEqual({ imageId: null });
    });

    it("does not allow null imageId when creating an employee", () => {
        expect(employeeCreateSchema.safeParse({ imageId: null }).success).toBe(false);
    });
});
