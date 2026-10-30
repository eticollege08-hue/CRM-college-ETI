import { z } from "zod";

export const projectCreateSchema = z.strictObject({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
});

export const projectUpdateSchema = projectCreateSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0);
