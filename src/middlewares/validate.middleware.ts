import { ApiError } from "#utils/error.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";

import type { RequestHandler } from "express";
import type { ZodObject } from "zod";
import { AuthError } from "#modules/auth/auth.error.js";

export const validateBody =
    (schema: ZodObject, mode: "default" | "auth" = "default"): RequestHandler =>
    (req, res, next) => {
        const body: unknown = req.body;

        if (mode === "auth") {
            if (body === null || typeof body !== "object" || Array.isArray(body)) {
                return next(new AuthError({ kind: "BAD_REQUEST" }));
            }
        } else if (!body || Object.keys(body).length === 0) {
            return next(new ApiError(HttpStatus.BAD_REQUEST, "Тіло запиту є необхідним"));
        }

        const result = schema.safeParse(body);

        if (!result.success) {
            if (mode === "auth") {
                const details = result.error.issues.flatMap((issue) => {
                    if (issue.code === "unrecognized_keys") {
                        return issue.keys.map((key) => ({
                            field: key || "body",
                            message: "This field is not allowed.",
                        }));
                    }

                    return [
                        {
                            field: issue.path.map(String).join(".") || "body",
                            message: issue.message,
                        },
                    ];
                });

                return next(
                    new AuthError({
                        kind: "VALIDATION_ERROR",
                        details,
                    }),
                );
            }

            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Помилка валідації даних",
                details: result.error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        req.body = result.data;
        next();
    };

export const validateParams =
    (schema: ZodObject): RequestHandler =>
    (req, res, next) => {
        if (!req.params)
            return next(new ApiError(HttpStatus.BAD_REQUEST, "Невірний формат параметрів запиту"));

        const result = schema.safeParse(req.params);

        if (!result.success) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Помилка валідації даних",
                details: result.error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        req.params = result.data as Record<string, string>;
        next();
    };
