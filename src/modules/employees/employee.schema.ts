import { z } from "zod";

const optionalTextSchema = z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value.length > 0 ? value : null));

export const employeeCreateSchema = z.strictObject({
    fullName: z.string().trim().min(1).max(150),
    phoneNumber: z.string().trim().min(1).max(30),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    managerId: z.uuid(),
    position: z.string().trim().min(1).max(100),
    experience: z.number().int().min(0),
    salary: z.number().positive().finite(),
    projects: z.string().trim().max(1000),
});

export const employeeUpdateSchema = z
    .strictObject({
        fullName: z.string().trim().min(1).max(150).optional(),
        position: optionalTextSchema.optional(),
        level: optionalTextSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0);
