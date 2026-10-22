import { getLoginRateLimitConfig } from "#config/auth.config.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { AUTH_MESSAGES } from "#modules/auth/auth.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { LoginRateLimitConfig } from "#config/auth.config.js";

export class AuthRateLimitService {
    private readonly failures = new Map<string, number[]>();
    private readonly pendingAttempts = new Map<string, Promise<void>>();
    private readonly maxAttempts: number;
    private readonly windowMs: number;
    private nextCleanupAt = 0;

    constructor(
        config: LoginRateLimitConfig = getLoginRateLimitConfig(),
        private readonly now: () => number = Date.now,
    ) {
        if (!Number.isSafeInteger(config.maxAttempts) || config.maxAttempts < 1) {
            throw new Error("maxAttempts must be a positive safe integer.");
        }

        if (!Number.isSafeInteger(config.windowMs) || config.windowMs < 1) {
            throw new Error("windowMs must be a positive safe integer.");
        }

        this.maxAttempts = config.maxAttempts;
        this.windowMs = config.windowMs;
    }

    isBlocked(email: string, ip: string): boolean {
        const now = this.now();
        this.cleanupExpired(now);
        return this.getActiveFailures(this.getKey(email, ip), now).length >= this.maxAttempts;
    }

    async runAttempt<T>(
        email: string,
        ip: string,
        verifyCredentials: () => Promise<T | null>,
    ): Promise<T> {
        const key = this.getKey(email, ip);
        const previousAttempt = this.pendingAttempts.get(key) ?? Promise.resolve();

        const currentAttempt = previousAttempt.then(async () => {
            if (this.isBlocked(email, ip)) {
                throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, AUTH_MESSAGES.TOO_MANY_ATTEMPTS);
            }

            const result = await verifyCredentials();

            if (result === null) {
                this.recordFailure(email, ip);

                throw new ApiError(HttpStatus.UNAUTHORIZED, AUTH_MESSAGES.INVALID_CREDENTIALS);
            }

            return result;
        });

        // A rejected attempt must not prevent the next queued attempt from running.
        const settledAttempt = currentAttempt.then(
            () => undefined,
            () => undefined,
        );

        this.pendingAttempts.set(key, settledAttempt);

        try {
            return await currentAttempt;
        } finally {
            // An older attempt must not remove a newer queue entry.
            if (this.pendingAttempts.get(key) === settledAttempt) {
                this.pendingAttempts.delete(key);
            }
        }
    }

    recordFailure(email: string, ip: string): void {
        const now = this.now();
        this.cleanupExpired(now);

        const key = this.getKey(email, ip);
        const failures = this.getActiveFailures(key, now);

        // Blocked requests must not extend the lockout.
        if (failures.length >= this.maxAttempts) {
            return;
        }

        failures.push(now);
        this.failures.set(key, failures);
    }

    private getKey(email: string, ip: string): string {
        return JSON.stringify([email.trim().toLowerCase(), ip]);
    }

    private getActiveFailures(key: string, now: number): number[] {
        const failures = this.failures.get(key);

        if (!failures) {
            return [];
        }

        const activeFailures = failures.filter((failedAt) => failedAt > now - this.windowMs);

        if (activeFailures.length === 0) {
            this.failures.delete(key);
        } else {
            this.failures.set(key, activeFailures);
        }

        return activeFailures;
    }

    private cleanupExpired(now: number): void {
        if (now < this.nextCleanupAt) {
            return;
        }

        for (const key of this.failures.keys()) {
            this.getActiveFailures(key, now);
        }

        this.nextCleanupAt = now + Math.min(this.windowMs, 60_000);
    }
}

export const authRateLimitService = new AuthRateLimitService();
