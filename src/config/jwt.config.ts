import { AUTH_TOKEN_TTL_SECONDS } from "#modules/auth/auth.constants.js";

export function getJwtConfig() {
    const secret = process.env.JWT_SECRET;
    const value = process.env.JWT_EXPIRES_IN ?? String(AUTH_TOKEN_TTL_SECONDS);
    const expiresIn = Number(value);

    if (!secret?.trim()) {
        throw new Error("JWT_SECRET must be configured.");
    }

    if (!/^\d+$/.test(value) || !Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
        throw new Error("JWT_EXPIRES_IN must be a positive integer in seconds.");
    }

    if (expiresIn !== AUTH_TOKEN_TTL_SECONDS) {
        throw new Error("JWT_EXPIRES_IN must be 3600 seconds to match the auth contract.");
    }

    return { secret, expiresIn };
}
