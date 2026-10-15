import { z } from "zod";
import { Role } from "@prisma/client";

export const userAccountCreateSchema = z.object({
    employeeId: z.uuid(),
    email: z.email().transform((email) => email.trim().toLowerCase()),
    passwordHash: z.string().min(1),
    roleKey: z.enum(Role),
    isActive: z.boolean().optional(),
});
