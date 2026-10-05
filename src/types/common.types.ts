import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export interface ApiErrorInterface {
    message: string;
    status: number;
    name: string;
}

export interface ErrorInterface {
    message: string;
}

export type AnyError = ApiErrorInterface | ErrorInterface | PrismaClientKnownRequestError | Error;
