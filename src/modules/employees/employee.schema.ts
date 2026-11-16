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

export const employeeSalaryUpdateSchema = z.strictObject({
    salary: z.number().finite().nonnegative(),
    currency: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/)
        .optional(),
});
