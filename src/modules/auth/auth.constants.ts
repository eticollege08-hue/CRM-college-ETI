import { HttpStatus } from "#constants/http-status.constants.js";

export const AUTH_ERRORS = {
    BAD_REQUEST: {
        status: HttpStatus.BAD_REQUEST,
        code: "BAD_REQUEST",
        message: "Invalid request.",
    },
    UNAUTHORIZED: {
        status: HttpStatus.UNAUTHORIZED,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
    },
    INVALID_CREDENTIALS: {
        status: HttpStatus.UNAUTHORIZED,
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
    },
    TOKEN_STALE: {
        status: HttpStatus.UNAUTHORIZED,
        code: "TOKEN_STALE",
        message: "Your session is no longer valid. Please sign in again.",
    },
    FORBIDDEN: {
        status: HttpStatus.FORBIDDEN,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
    },
    INTERNAL_SERVER_ERROR: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
    },
    VALIDATION_ERROR: {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: "VALIDATION_ERROR",
        message: "Please correct the highlighted fields.",
    },
    TOO_MANY_ATTEMPTS: {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: "TOO_MANY_ATTEMPTS",
        message: "Too many attempts. Please try again later.",
    },
} as const;

export const AUTH_COOKIE_NAME = "crm_access_token";
export const AUTH_TOKEN_TTL_SECONDS = 3600;
export const AUTH_SUCCESS_MESSAGES = {
    LOGOUT: "Signed out successfully.",
};
