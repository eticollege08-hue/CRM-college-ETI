import { z } from "zod";

const optionalTextSchema = z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value.length > 0 ? value : null));

export const employeeUpdateSchema = z
    .strictObject({
        fullName: z.string().trim().min(1).max(150).optional(),
        position: optionalTextSchema.optional(),
        level: optionalTextSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0);
