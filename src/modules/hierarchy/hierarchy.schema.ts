import { z } from "zod";

export const hierarchyCreateSchema = z.strictObject({
    employeeId: z.uuid(),
    subordinateId: z.uuid(),
});

export const hierarchyUpdateSchema = hierarchyCreateSchema.partial();
