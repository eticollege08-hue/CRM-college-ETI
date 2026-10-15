import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { z } from "zod";

import type { jwtPayloadSchema, jwtSchema } from "#schemas/jwt.schema.js";

export interface ApiErrorInterface {
    message: string;
    status: number;
    name: string;
}

export interface ErrorInterface {
    message: string;
}

export type AnyError = ApiErrorInterface | ErrorInterface | PrismaClientKnownRequestError | Error;

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;
export type JWT = z.infer<typeof jwtSchema>;
