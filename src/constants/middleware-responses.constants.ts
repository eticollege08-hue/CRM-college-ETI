export const AUTH_MIDDLEWARE_RESPONSES = {
    UNAUTHORIZED: {
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
        details: [],
    },
    TOKEN_STALE: {
        success: false,
        code: "TOKEN_STALE",
        message: "Your session is no longer valid. Please sign in again.",
        details: [],
    },
} as const;
