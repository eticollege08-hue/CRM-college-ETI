import { randomBytes } from "node:crypto";

import { hashPassword, verifyPassword } from "#utils/password.util.js";

import { AUTH_TOKEN_TTL_SECONDS } from "./auth.constants.js";
import { AuthRateLimitService } from "./auth-rate-limit.service.js";
import { authTokenService } from "./auth-token.service.js";

import type {
    AuthLoginInput,
    AuthLoginResult,
    AuthPasswords,
    AuthTokenIssuer,
    AuthUserAccounts,
} from "./auth.types.js";

export class AuthService {
    private dummyHash: Promise<string> | undefined;

    constructor(
        private readonly accounts: AuthUserAccounts,
        private readonly tokens: AuthTokenIssuer = authTokenService,
        private readonly limiter = new AuthRateLimitService(),
        private readonly passwords: AuthPasswords = {
            hash: hashPassword,
            verify: verifyPassword,
        },
        private readonly now: () => Date = () => new Date(),
    ) {}

    async login(input: AuthLoginInput, ip: string): Promise<AuthLoginResult> {
        const email = input.email.trim().toLowerCase();

        return this.limiter.runAttempt(email, ip, async () => {
            // Missing accounts still incur a bcrypt comparison, without creating an account.
            this.dummyHash ??= this.passwords.hash(randomBytes(32).toString("hex"));
            const dummyHash = await this.dummyHash;
            const account = await this.accounts.findForAuthentication(email);
            const matches = await this.passwords.verify(
                input.password,
                account?.passwordHash ?? dummyHash,
            );

            if (!account || !account.isActive || !matches) {
                return null;
            }

            const token = await this.tokens.issue(
                { userId: account.id, role: account.role },
                AUTH_TOKEN_TTL_SECONDS,
            );

            if (token.length === 0) {
                throw new Error("Token issuer returned an empty token.");
            }

            await this.accounts.updateLastLoginAt(account.id, this.now());

            return { token, expiresIn: AUTH_TOKEN_TTL_SECONDS };
        });
    }
}
