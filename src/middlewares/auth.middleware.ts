import jwt from "jsonwebtoken";

import { HttpStatus } from "#constants/http-status.constants.js";
import { AUTH_MIDDLEWARE_RESPONSES } from "#constants/middleware-responses.constants.js";
import { AUTH_COOKIE_NAME } from "#modules/auth/auth.constants.js";
import { clearAuthCookie } from "#modules/auth/auth-cookie.util.js";
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
        return res.status(HttpStatus.UNAUTHORIZED).json(AUTH_MIDDLEWARE_RESPONSES.UNAUTHORIZED);
    }

    try {
        req.user = verifyToken(token);
    } catch (error: unknown) {
        if (
            !(error instanceof jwt.TokenExpiredError) &&
            !(error instanceof jwt.JsonWebTokenError) &&
            !(error instanceof jwt.NotBeforeError)
        ) {
            return next(error);
        }

        const response =
            error instanceof jwt.TokenExpiredError
                ? AUTH_MIDDLEWARE_RESPONSES.TOKEN_STALE
                : AUTH_MIDDLEWARE_RESPONSES.UNAUTHORIZED;

        clearAuthCookie(res);
        return res.status(HttpStatus.UNAUTHORIZED).json(response);
    }

    next();
}
