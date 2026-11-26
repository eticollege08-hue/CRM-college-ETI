import { z } from "zod";

export const aboutUsCreateSchema = z.strictObject({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
});

export const aboutUsUpdateSchema = aboutUsCreateSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export const aboutUsOrderSchema = z.strictObject({
    ids: z.array(z.uuid()).min(1),
});
