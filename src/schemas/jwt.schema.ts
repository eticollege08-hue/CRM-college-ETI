import { z } from "zod";

// CRM-102.2 roles, validated independently of the pending Prisma data model.
export const jwtPayloadSchema = z.strictObject({
    userId: z.uuid(),
    role: z.enum(["OWNER", "MANAGER", "RECRUITER", "HR", "WORKER"]),
});

export const jwtSchema = jwtPayloadSchema.extend({
    exp: z.number().int().positive(),
    iat: z.number().int().nonnegative().optional(),
    nbf: z.number().int().nonnegative().optional(),
});
