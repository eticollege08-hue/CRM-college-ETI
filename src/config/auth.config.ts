export function getBcryptCost(): number {
    const value = process.env.BCRYPT_COST ?? "12";
    const cost = Number(value);

    if (!/^\d+$/.test(value) || !Number.isInteger(cost) || cost < 4 || cost > 31) {
        throw new Error("BCRYPT_COST must be an integer between 4 and 31.");
    }

    return cost;
}

export interface LoginRateLimitConfig {
    maxAttempts: number;
    windowMs: number;
}

function readPositiveInteger(name: string, fallback: string): number {
    const value = process.env[name] ?? fallback;
    const number = Number(value);

    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1) {
        throw new Error(`${name} must be a positive safe integer.`);
    }

    return number;
}

export function getLoginRateLimitConfig(): LoginRateLimitConfig {
    const maxAttempts = readPositiveInteger("LOGIN_MAX_FAILED_ATTEMPTS", "5");
    const windowSeconds = readPositiveInteger("LOGIN_ATTEMPT_WINDOW_SECONDS", "300");
    const windowMs = windowSeconds * 1000;

    if (!Number.isSafeInteger(windowMs)) {
        throw new Error("LOGIN_ATTEMPT_WINDOW_SECONDS is too large.");
    }

    return {
        maxAttempts,
        windowMs,
    };
}

export function getAuthCookieSecure(): boolean {
    const value = process.env.AUTH_COOKIE_SECURE ?? "true";

    if (value !== "true" && value !== "false") {
        throw new Error("AUTH_COOKIE_SECURE must be true or false.");
    }

    if (value === "false" && process.env.NODE_ENV !== "development") {
        throw new Error("AUTH_COOKIE_SECURE=false is allowed only in development.");
    }

    return value === "true";
}

export function getAuthAllowedOrigins(): string[] {
    const value = process.env.AUTH_ALLOWED_ORIGINS;

    if (!value?.trim()) {
        throw new Error("AUTH_ALLOWED_ORIGINS must contain at least one origin.");
    }

    const origins = value.split(",").map((origin) => origin.trim());

    for (const origin of origins) {
        try {
            const url = new URL(origin);

            if (
                (url.protocol !== "http:" && url.protocol !== "https:") ||
                url.hostname.includes("*") ||
                url.origin !== origin
            ) {
                throw new Error("Invalid origin.");
            }
        } catch {
            throw new Error(
                "AUTH_ALLOWED_ORIGINS must contain comma-separated canonical HTTP(S) origins without paths, credentials or wildcards.",
            );
        }
    }

    return [...new Set(origins)];
}
