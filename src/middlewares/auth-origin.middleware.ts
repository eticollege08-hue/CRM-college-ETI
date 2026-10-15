import { getAuthAllowedOrigins } from "#config/auth.config.js";
import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { RequestHandler } from "express";

export const checkAuthOrigin: RequestHandler = (req, _res, next) => {
    const origin = req.headers.origin;
    if (!origin || !getAuthAllowedOrigins().includes(origin)) {
        return next(new ApiError(HttpStatus.FORBIDDEN, API_MESSAGES.FORBIDDEN));
    }
    next();
};
