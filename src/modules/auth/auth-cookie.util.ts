import { getAuthCookieSecure } from "#config/auth.config.js";

import { AUTH_COOKIE_NAME, AUTH_TOKEN_TTL_SECONDS } from "./auth.constants.js";

import type { CookieOptions, Response } from "express";

function getAuthCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: getAuthCookieSecure(),
        sameSite: "lax",
        path: "/api",
    };
}

export function setAuthCookie(res: Response, token: string): void {
    if (token.length === 0) {
        throw new Error("Auth token must not be empty.");
    }

    res.cookie(AUTH_COOKIE_NAME, token, {
        ...getAuthCookieOptions(),
        maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
    });
    res.setHeader("Cache-Control", "no-store");
}

export function clearAuthCookie(res: Response): void {
    // Express clearCookie removes maxAge, but our contract requires Max-Age=0.
    res.cookie(AUTH_COOKIE_NAME, "", {
        ...getAuthCookieOptions(),
        maxAge: 0,
    });
    res.setHeader("Cache-Control", "no-store");
}
