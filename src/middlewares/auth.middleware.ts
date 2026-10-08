import jwt from "jsonwebtoken";

import { verifyToken } from "#utils/jwt.util.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { AUTH_MIDDLEWARE_RESPONSES } from "#constants/middleware-responses.constants.js";

import type { Request, Response, NextFunction } from "express";
import type { JWT } from "#types/common.types.js";

declare module "express-serve-static-core" {
    interface Request {
        user?: JWT;
    }
}

export function isAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.crm_access_token;

    if (typeof token !== "string" || token.length === 0) {
        res.clearCookie("crm_access_token", { path: "/api" });
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

        res.clearCookie("crm_access_token", { path: "/api" });
        return res.status(HttpStatus.UNAUTHORIZED).json(response);
    }

    next();
}
