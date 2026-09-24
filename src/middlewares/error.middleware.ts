import { ApiError } from "#utils/error.util.js";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import type { Request, Response, NextFunction } from "express";
import type { AnyError, ApiErrorInterface } from "#types/common.types.js";

export const errorHandler = (err: AnyError, req: Request, res: Response, next: NextFunction) => {
    const isApiRequest = 
        req.path.startsWith('/api') || 
        req.headers.accept?.includes('application/json') ||
        req.xhr;

    const sendErrorResponse = (status: number, message: string, details?: any) => {
        if (isApiRequest) {
            const responseBody: any = { success: false, message };
            if (details) responseBody.details = details;
            return res.status(status).json(responseBody);
        }

        // Якщо це SSR — рендеримо твою сторінку помилки
        return res.status(status).render('error', { 
            success: false,
            status,
            message 
        });
    };

    if (err instanceof PrismaClientKnownRequestError) {
        const PrismaError: Record<string, { message: string; status: number }> = {
            P2002: { message: "Element already exists", status: 409 },
            P2003: { message: "Related record not found", status: 400 },
            P2025: { message: "Element with this id does not exist", status: 404 },
            P2000: { message: "Value too long", status: 400 },
            P2005: { message: "Invalid data type", status: 400 },
            P2006: { message: "Wrong data", status: 400 }
        };

        const error = PrismaError[err.code];

        if (!error) {
            return sendErrorResponse(500, "Database error");
        }

        return sendErrorResponse(error.status, error.message);
    }

    if (err instanceof ApiError) {
        const status = (err as ApiErrorInterface).status || 500;
        return sendErrorResponse(status, err.message);
    }

    if (err instanceof ZodError) {
        const message = err.issues[0]?.message || "Validation failed";
        const details = err.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));
        return sendErrorResponse(400, message, details);
    }
   
    console.error(err);
    return sendErrorResponse(500, "Internal server error");
};