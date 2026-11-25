import jwt from "jsonwebtoken";

import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { AUTH_COOKIE_NAME } from "#modules/auth/auth.constants.js";
import { clearAuthCookie } from "#utils/auth-cookie.util.js";
import { ApiError } from "#utils/error.util.js";
import { verifyToken } from "#utils/jwt.util.js";

import type { NextFunction, Request, Response } from "express";
import type { JWT } from "#types/common.types.js";

declare module "express-serve-static-core" {
    interface Request {
        user?: JWT;
    }
}

export function isAuth(req: Request, res: Response, next: NextFunction) {
    const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
    if (typeof token !== "string" || token.length === 0) {
        clearAuthCookie(res);
        return rejectUnauthenticated(req, res, next, API_MESSAGES.UNAUTHORIZED);
    }
    try {
        req.user = verifyToken(token);
    } catch (error: unknown) {
        if (
            error instanceof jwt.JsonWebTokenError ||
            error instanceof jwt.TokenExpiredError ||
            error instanceof jwt.NotBeforeError
        ) {
            clearAuthCookie(res);
            return rejectUnauthenticated(
                req,
                res,
                next,
                error instanceof jwt.TokenExpiredError
                    ? API_MESSAGES.TOKEN_EXPIRED
                    : API_MESSAGES.UNAUTHORIZED,
            );
        }
        return next(error);
    }
    next();
}

function rejectUnauthenticated(req: Request, res: Response, next: NextFunction, message: string) {
    const requestPath = req.originalUrl ?? req.url ?? "";
    if (requestPath.length > 0 && !requestPath.startsWith("/api/")) {
        return res.redirect("/login");
    }
    return next(new ApiError(HttpStatus.UNAUTHORIZED, message));
}
