import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";

export const ALL_ROLES = [
    "OWNER",
    "MANAGER",
    "RECRUITER",
    "HR",
    "WORKER",
] as const satisfies readonly Role[];
export const PUBLIC_ACCESS = "PUBLIC";

export function accessFor(roles: readonly Role[] | typeof PUBLIC_ACCESS): RequestHandler {
    return (req, _res, next) => {
        if (roles === PUBLIC_ACCESS) return next();
        const role = req.user?.role;
        if (!role || !roles.includes(role)) {
            return next(new ApiError(HttpStatus.NOT_FOUND, API_MESSAGES.NOT_FOUND));
        }

        next();
    };
}
