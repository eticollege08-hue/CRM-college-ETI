import jwt from "jsonwebtoken";

import type { JWT, JWTPayload } from "#types/common.types.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN);

export function generateToken(payload: JWTPayload) {
    if (!Number.isSafeInteger(JWT_EXPIRES_IN) || JWT_EXPIRES_IN <= 0) {
        throw new Error("JWT_EXPIRES_IN must be a positive integer in seconds");
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as JWT;
}
