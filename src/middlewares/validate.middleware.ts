import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { RequestHandler } from "express";
import type { ZodObject } from "zod";

export const validateBody =
    (schema: ZodObject): RequestHandler =>
    (req, _res, next) => {
        const body: unknown = req.body;
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
            return next(new ApiError(HttpStatus.BAD_REQUEST, API_MESSAGES.BAD_REQUEST));
        }
        const result = schema.strict().safeParse(body);
        if (!result.success) return next(result.error);
        req.body = result.data;
        next();
    };

export const validateParams =
    (schema: ZodObject): RequestHandler =>
    (req, _res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) return next(result.error);
        for (const [key, value] of Object.entries(result.data)) {
            if (typeof value !== "string") {
                return next(new ApiError(HttpStatus.BAD_REQUEST, API_MESSAGES.BAD_REQUEST));
            }
            req.params[key] = value;
        }
        next();
    };
