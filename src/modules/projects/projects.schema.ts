import { z } from "zod";

export const projectCreateSchema = z.strictObject({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(1000),
    ownerId: z.uuid().nullable().optional(),
    budget: z.number().finite().positive().multipleOf(0.01).nullable().optional(),
    deadline: z.iso.date().nullable().optional(),
    links: z
        .array(z.url({ protocol: /^https?$/ }))
        .max(20)
        .optional(),
    memberIds: z
        .array(z.uuid())
        .max(100)
        .refine((ids) => new Set(ids).size === ids.length, "Team members must be unique.")
        .optional(),
});

export const projectUpdateSchema = projectCreateSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0);
