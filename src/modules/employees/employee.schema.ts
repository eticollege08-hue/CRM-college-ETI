import { z } from "zod";

export const employeeCreateSchema = z.object({
    fullName: z.string().trim().min(1).optional(),
    imageId: z.string().trim().min(1).optional(),
    level: z.string().trim().min(1).optional(),
    position: z.string().trim().min(1).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();
