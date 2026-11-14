import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { Request } from "express";
import type { JWT } from "#types/common.types.js";

// Tenant-scoped handlers run after isAuth; the company always comes from the verified JWT.
export function getAuthUser(req: Request): JWT {
    if (!req.user) throw new ApiError(HttpStatus.UNAUTHORIZED, API_MESSAGES.UNAUTHORIZED);
    return req.user;
}
