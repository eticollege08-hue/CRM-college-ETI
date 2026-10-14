import express from "express";

import { HttpStatus } from "#constants/http-status.constants.js";
import { asyncCatch } from "#middlewares/asyncCatch.middleware.js";
import { validateBody } from "#middlewares/validate.middleware.js";

import { AuthController } from "./auth.controller.js";
import { clearAuthCookie } from "./auth-cookie.util.js";
import { AuthError } from "./auth.error.js";
import { createAuthOriginMiddleware } from "./auth-origin.middleware.js";
import { authLoginSchema } from "./auth.schema.js";

import type { ErrorRequestHandler, RequestHandler } from "express";
import type { AuthService } from "./auth.service.js";

// Construct once after dotenv and mount under /api/auth after the real adapters exist.
export default function createAuthRouter(service: AuthService, authenticate: RequestHandler) {
    const router = express.Router();
    const controller = new AuthController(service);
    const checkOrigin = createAuthOriginMiddleware();

    router.post(
        "/login",
        checkOrigin,
        (req, _res, next) => {
            // express.json() parses an explicitly zero-length JSON body as {}.
            if (req.headers["content-length"] === "0") {
                return next(new AuthError({ kind: "BAD_REQUEST" }));
            }
            next();
        },
        validateBody(authLoginSchema, "auth"),
        asyncCatch(controller.login),
    );
    router.post(
        "/logout",
        checkOrigin,
        (req, _res, next) => {
            const hasBody =
                req.headers["transfer-encoding"] !== undefined ||
                Number(req.headers["content-length"] ?? "0") > 0 ||
                (req.body !== undefined && req.headers["content-length"] !== "0");

            if (hasBody) {
                return next(new AuthError({ kind: "BAD_REQUEST" }));
            }
            next();
        },
        authenticate,
        asyncCatch(controller.logout),
    );

    const handleAuthError: ErrorRequestHandler = (error: unknown, req, res, next) => {
        if (res.headersSent) {
            return next(new AuthError({ kind: "INTERNAL_SERVER_ERROR" }));
        }

        if (error instanceof AuthError) {
            if (
                req.path.toLowerCase().replace(/\/$/, "") === "/logout" &&
                error.status === HttpStatus.UNAUTHORIZED
            ) {
                clearAuthCookie(res);
            }
            return next(error);
        }

        // Do not log upstream exceptions: they can include hashes, tokens or credentials.
        console.error("Authentication request failed.");
        next(new AuthError({ kind: "INTERNAL_SERVER_ERROR" }));
    };

    router.use(handleAuthError);
    return router;
}
