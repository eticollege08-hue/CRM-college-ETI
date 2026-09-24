import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import type { RequestHandler } from "express";
import type { ZodObject } from "zod";

export const validateBody = (schema: ZodObject): RequestHandler =>  (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return next(new ApiError(HttpStatus.BAD_REQUEST, "Тіло запиту є необхідним"));
    }

    const result = schema.safeParse(req.body);

    if (!result.success) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Помилка валідації даних",
                details: result.error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

    req.body = result.data;
    next();
}

export const validateParams = (schema: ZodObject): RequestHandler => (req, res, next) => {
    if(!req.params) return next(new ApiError(HttpStatus.BAD_REQUEST, "Невірний формат параметрів запиту"));

    const result = schema.safeParse(req.params);

    if (!result.success) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Помилка валідації даних",
                details: result.error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message 
                }))
            });
        }

    req.params = result.data as Record<string, string>;
    next();
}
