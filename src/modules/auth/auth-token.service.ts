import { getJwtConfig } from "#config/jwt.config.js";
import { jwtPayloadSchema } from "#schemas/jwt.schema.js";
import { generateToken } from "#utils/jwt.util.js";

import type { AuthTokenIssuer, AuthTokenPayload } from "./auth.types.js";

export class AuthTokenService implements AuthTokenIssuer {
    async issue(payload: AuthTokenPayload, expiresIn: number): Promise<string> {
        if (expiresIn !== getJwtConfig().expiresIn) {
            throw new Error("Token lifetime must match the JWT configuration and auth cookie.");
        }

        return generateToken(jwtPayloadSchema.parse(payload));
    }
}

export const authTokenService = new AuthTokenService();
