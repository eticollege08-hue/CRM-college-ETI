import { z } from "zod";

const optionalTextSchema = z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value.length > 0 ? value : null));

export const employeeUpdateSchema = z
    .strictObject({
        managerId: z.uuid().nullable().optional(),
        projectIds: z.array(z.uuid()).max(200).optional(),
        certifications: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
        experience: z.number().nonnegative().max(100).optional(),
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

export const employeeCreateSchema = z.strictObject({
    email: z
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    role: z.enum(["OWNER", "WORKER", "HR", "MANAGER", "RECRUITER"]).default("WORKER"),
    fullName: z.string().trim().min(1).max(150).optional(),
    phoneNumber: z.string().trim().max(40).optional(),
    level: optionalTextSchema.optional(),
    position: optionalTextSchema.optional(),
    managerId: z.uuid().optional(),
    experience: z.number().nonnegative().max(100).optional(),
    salary: z.number().nonnegative().max(9999999999.99).optional(),
});
export const employeeListSchema = z.strictObject({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    position: z.string().trim().min(1).max(100).optional(),
    level: z.string().trim().min(1).max(100).optional(),
    projectId: z.uuid().optional(),
});
export const dismissalSchema = z.strictObject({
    replacementManagerId: z.uuid().nullable().optional(),
});
