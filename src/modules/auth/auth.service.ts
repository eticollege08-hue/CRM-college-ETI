import { randomBytes } from "node:crypto";

import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { authRateLimitService } from "#services/auth-rate-limit.service.js";
import { generateToken } from "#utils/jwt.util.js";
import { hashPassword, verifyPassword } from "#utils/password.util.js";

import type { UserAccountService } from "#modules/user-accounts/user-account.service.js";
import type { AuthRateLimitService } from "#services/auth-rate-limit.service.js";
import type { AuthLoginInput } from "./auth.types.js";

export class AuthService {
    private dummyHash: Promise<string> | undefined;

    constructor(
        private readonly accounts: UserAccountService = userAccountService,
        private readonly limiter: AuthRateLimitService = authRateLimitService,
    ) {}

    private getDummyHash() {
        this.dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
        return this.dummyHash;
    }

    async login(input: AuthLoginInput, ip: string) {
        const email = input.email.trim().toLowerCase();
        return this.limiter.runAttempt(email, ip, async () => {
            const dummyHash = await this.getDummyHash();
            const account = await this.accounts.getByEmail(email);
            const matches = await verifyPassword(
                input.password,
                account?.passwordHash ?? dummyHash,
            );
            if (!account || !account.isActive || !matches) return null;

            const token = generateToken({ userId: account.id, role: account.roleKey });
            await this.accounts.updateLastLoginAt(account.id);
            return token;
        });
    }
}
export const authService = new AuthService();
