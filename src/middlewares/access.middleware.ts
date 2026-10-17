import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";

export function accessFor(roles: readonly Role[]): RequestHandler {
    return (req, _res, next) => {
        const role = req.user?.role;
        if (!role || !roles.includes(role)) {
            return next(new ApiError(HttpStatus.FORBIDDEN, API_MESSAGES.FORBIDDEN));
        }

        next();
    };
}
