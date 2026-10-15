import { Buffer } from "node:buffer";

export function getJwtConfig() {
    const secret = process.env.JWT_SECRET;
    const value = process.env.JWT_EXPIRES_IN ?? "3600";
    const expiresIn = Number(value);

    if (!secret?.trim() || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error(
            "JWT_SECRET must contain at least 32 bytes; use a cryptographically generated secret.",
        );
    }
    if (
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(expiresIn) ||
        expiresIn <= 0 ||
        !Number.isSafeInteger(expiresIn * 1000)
    ) {
        throw new Error("JWT_EXPIRES_IN must be a positive integer in seconds.");
    }
    return { secret, expiresIn };
}
