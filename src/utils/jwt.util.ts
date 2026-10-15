import jwt from "jsonwebtoken";

import { getJwtConfig } from "#config/jwt.config.js";
import { jwtPayloadSchema, jwtSchema } from "#schemas/jwt.schema.js";

import type { JWT, JWTPayload } from "#types/common.types.js";

// CRM-102.2 signing/verification; read env at call time so dotenv can run first.
export function generateToken(payload: JWTPayload): string {
    const { secret, expiresIn } = getJwtConfig();
    const validated = jwtPayloadSchema.parse(payload);

    return jwt.sign(validated, secret, { algorithm: "HS256", expiresIn });
}

export function verifyToken(token: string): JWT {
    const { secret } = getJwtConfig();
    const decoded: unknown = jwt.verify(token, secret, { algorithms: ["HS256"] });
    const result = jwtSchema.safeParse(decoded);

    if (!result.success) {
        throw new jwt.JsonWebTokenError("Invalid token payload.");
    }

    return result.data;
}
