import { z } from "zod";
import { Role } from "@prisma/client";

export const userAccountCreateSchema = z.object({
    employeeId: z.uuid(),
    email: z.email().transform((email) => email.trim().toLowerCase()),
    passwordHash: z.string().min(1),
    roleKey: z.enum(Role),
    isActive: z.boolean().optional(),
});

const optionalContactSchema = (maxLength: number) =>
    z
        .string()
        .trim()
        .max(maxLength)
        .transform((value) => (value.length > 0 ? value : null));

const optionalPhoneSchema = z
    .string()
    .trim()
    .max(30)
    .transform((value) => (value.length > 0 ? value : null))
    .refine((value) => {
        if (value === null) return true;
        const digits = value.replace(/\D/g, "");
        return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
    });

export const userAccountProfileUpdateSchema = z
    .strictObject({
        fullName: z.string().trim().min(1).max(150).optional(),
        email: z.email().max(254).trim().toLowerCase().optional(),
        phoneNumber: optionalPhoneSchema.optional(),
        slack: optionalContactSchema(100).optional(),
        telegram: optionalContactSchema(100).optional(),
        viber: optionalPhoneSchema.optional(),
        whatsapp: optionalPhoneSchema.optional(),
        discord: optionalContactSchema(100).optional(),
    })
    .refine((data) => Object.keys(data).length > 0);
