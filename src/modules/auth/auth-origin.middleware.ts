import { getAuthAllowedOrigins } from "#config/auth.config.js";

import { AuthError } from "./auth.error.js";

import type { RequestHandler } from "express";

export function createAuthOriginMiddleware(): RequestHandler {
    const allowedOrigins = new Set(getAuthAllowedOrigins());

    return (req, _res, next) => {
        if (req.method !== "POST") {
            return next();
        }

        const origin: unknown = req.headers.origin;

        if (origin !== undefined) {
            if (typeof origin === "string" && allowedOrigins.has(origin)) {
                return next();
            }

            // An invalid Origin must not be overridden by a valid Referer.
            return next(new AuthError({ kind: "FORBIDDEN" }));
        }

        const referer: unknown = req.headers.referer;

        if (
            typeof referer !== "string" ||
            !/^https?:\/\//.test(referer) ||
            /[\s\\]/.test(referer)
        ) {
            return next(new AuthError({ kind: "FORBIDDEN" }));
        }

        let refererUrl: URL;

        try {
            refererUrl = new URL(referer);
        } catch {
            return next(new AuthError({ kind: "FORBIDDEN" }));
        }

        if (
            refererUrl.username !== "" ||
            refererUrl.password !== "" ||
            !allowedOrigins.has(refererUrl.origin)
        ) {
            return next(new AuthError({ kind: "FORBIDDEN" }));
        }

        return next();
    };
}
