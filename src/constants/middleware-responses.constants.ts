import { AUTH_ERRORS } from "#modules/auth/auth.constants.js";

export const AUTH_MIDDLEWARE_RESPONSES = {
    UNAUTHORIZED: {
        success: false,
        code: AUTH_ERRORS.UNAUTHORIZED.code,
        message: AUTH_ERRORS.UNAUTHORIZED.message,
        details: [],
    },
    TOKEN_STALE: {
        success: false,
        code: AUTH_ERRORS.TOKEN_STALE.code,
        message: AUTH_ERRORS.TOKEN_STALE.message,
        details: [],
    },
} as const;
