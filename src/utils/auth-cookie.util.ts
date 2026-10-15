import { getAuthCookieSecure } from "#config/auth.config.js";
import { getJwtConfig } from "#config/jwt.config.js";
import { AUTH_COOKIE_NAME } from "#modules/auth/auth.constants.js";

import type { CookieOptions, Response } from "express";

function getCookieOptions(): CookieOptions {
    return { httpOnly: true, secure: getAuthCookieSecure(), sameSite: "lax", path: "/" };
}

export function setAuthCookie(res: Response, token: string) {
    const options = getCookieOptions();
    res.cookie(AUTH_COOKIE_NAME, token, { ...options, maxAge: getJwtConfig().expiresIn * 1000 });
    res.setHeader("Cache-Control", "no-store");
}

export function clearAuthCookie(res: Response) {
    const options = getCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, options);
    res.setHeader("Cache-Control", "no-store");
}
