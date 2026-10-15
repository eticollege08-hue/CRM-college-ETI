import { Role } from "@prisma/client";
import { z } from "zod";

export const jwtPayloadSchema = z.strictObject({
    userId: z.uuid(),
    role: z.enum(Role),
});

export const jwtSchema = jwtPayloadSchema.extend({
    exp: z.number().int().positive(),
    iat: z.number().int().nonnegative().optional(),
    nbf: z.number().int().nonnegative().optional(),
});
