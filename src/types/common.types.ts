import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { UUID } from "node:crypto";
import type { Role } from "@prisma/client";

export interface ApiErrorInterface {
    message: string;
    status: number;
    name: string;
}

export interface ErrorInterface {
    message: string;
}

export type AnyError = ApiErrorInterface | ErrorInterface | PrismaClientKnownRequestError | Error;

export interface JWTPayload {
    userId: UUID;
    role: Role;
}

export interface JWT extends JWTPayload {
    exp: number;
}
