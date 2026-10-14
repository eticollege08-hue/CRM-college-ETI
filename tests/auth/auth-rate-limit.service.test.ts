import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthRateLimitService } from "../../src/modules/auth/auth-rate-limit.service.js";

const EMAIL = "olena@example.com";
const IP = "192.0.2.1";

describe("AuthRateLimitService", () => {
    let now: number;
    let limiter: AuthRateLimitService;

    beforeEach(() => {
        now = 0;
        limiter = new AuthRateLimitService({ maxAttempts: 5, windowMs: 300_000 }, () => now);
    });

    function recordFailures(count: number): void {
        for (let index = 0; index < count; index += 1) {
            limiter.recordFailure(EMAIL, IP);
        }
    }

    it("allows a pair without failed attempts", () => {
        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("allows another attempt after four failures", () => {
        recordFailures(4);

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("blocks the next attempt after five failures", () => {
        recordFailures(5);

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(300);
    });

    it("does not count checks as failed attempts", () => {
        for (let index = 0; index < 10; index += 1) {
            expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
        }
    });

    it("normalizes email when identifying the pair", () => {
        recordFailures(5);

        expect(limiter.getRetryAfterSeconds("  OLENA@EXAMPLE.COM  ", IP)).toBe(300);
    });

    it("does not block the same email from another IP", () => {
        recordFailures(5);

        expect(limiter.getRetryAfterSeconds(EMAIL, "192.0.2.2")).toBe(0);
    });

    it("does not block another email from the same IP", () => {
        recordFailures(5);

        expect(limiter.getRetryAfterSeconds("ivan@example.com", IP)).toBe(0);
    });

    it("rounds the remaining wait up to whole seconds", () => {
        recordFailures(5);
        now = 299_001;

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(1);
    });

    it("allows attempts exactly when the window expires", () => {
        recordFailures(5);
        now = 300_000;

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);

        recordFailures(1);

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("does not extend the lockout when another failure is recorded while blocked", () => {
        recordFailures(5);
        now = 100_000;

        recordFailures(1);

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(200);

        now = 300_000;

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("keeps newer failures when the oldest failure expires", () => {
        recordFailures(1);
        now = 100_000;
        recordFailures(4);
        now = 300_000;

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);

        recordFailures(1);

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(100);
    });

    it("uses the configured threshold and window", () => {
        limiter = new AuthRateLimitService({ maxAttempts: 2, windowMs: 10_000 }, () => now);

        recordFailures(2);

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(10);

        now = 10_000;

        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("rejects an invalid attempt threshold", () => {
        expect(() => new AuthRateLimitService({ maxAttempts: 0, windowMs: 1000 })).toThrow(
            "maxAttempts must be a positive safe integer.",
        );
    });

    it("rejects an invalid window", () => {
        expect(() => new AuthRateLimitService({ maxAttempts: 5, windowMs: 0 })).toThrow(
            "windowMs must be a positive safe integer.",
        );
    });
});

describe("AuthRateLimitService.runAttempt", () => {
    let now: number;
    let limiter: AuthRateLimitService;

    beforeEach(() => {
        now = 0;
        limiter = new AuthRateLimitService({ maxAttempts: 5, windowMs: 300_000 }, () => now);
    });

    it("returns the successful verification result unchanged", async () => {
        const account = { id: "test-account-id" };
        const verify = vi.fn(async () => account);

        const result = await limiter.runAttempt(EMAIL, IP, verify);

        expect(result).toBe(account);
        expect(verify).toHaveBeenCalledTimes(1);
        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("returns the generic 401 for failed verification", async () => {
        await expect(limiter.runAttempt(EMAIL, IP, async () => null)).rejects.toMatchObject({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
            details: [],
        });
    });

    it("does not count successful attempts as failures", async () => {
        const verify = vi.fn(async () => ({ id: "test-account-id" }));

        const results = await Promise.all(
            Array.from({ length: 10 }, () => limiter.runAttempt(EMAIL, IP, verify)),
        );

        expect(results).toHaveLength(10);
        expect(verify).toHaveBeenCalledTimes(10);
        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(0);
    });

    it("runs only five credential checks for ten concurrent failed attempts", async () => {
        const verify = vi.fn(async () => {
            await Promise.resolve();
            return null;
        });

        const results = await Promise.allSettled(
            Array.from({ length: 10 }, () => limiter.runAttempt(EMAIL, IP, verify)),
        );

        expect(verify).toHaveBeenCalledTimes(5);

        for (const result of results.slice(0, 5)) {
            expect(result).toMatchObject({
                status: "rejected",
                reason: {
                    status: 401,
                    code: "UNAUTHORIZED",
                    message: "Invalid email or password.",
                },
            });
        }

        for (const result of results.slice(5)) {
            expect(result).toMatchObject({
                status: "rejected",
                reason: {
                    status: 429,
                    code: "TOO_MANY_ATTEMPTS",
                    retryAfterSeconds: 300,
                },
            });
        }
    });

    it("never overlaps credential checks for the same pair", async () => {
        let activeChecks = 0;
        let maximumActiveChecks = 0;

        const verify = vi.fn(async () => {
            activeChecks += 1;
            maximumActiveChecks = Math.max(maximumActiveChecks, activeChecks);

            await Promise.resolve();

            activeChecks -= 1;
            return { id: "test-account-id" };
        });

        await Promise.all(Array.from({ length: 4 }, () => limiter.runAttempt(EMAIL, IP, verify)));

        expect(verify).toHaveBeenCalledTimes(4);
        expect(maximumActiveChecks).toBe(1);
    });

    it.each([
        { email: "ivan@example.com", ip: IP },
        { email: EMAIL, ip: "192.0.2.2" },
    ])("allows concurrent checks for a different pair $email / $ip", async (pair) => {
        let activeChecks = 0;
        let maximumActiveChecks = 0;

        const verify = async () => {
            activeChecks += 1;
            maximumActiveChecks = Math.max(maximumActiveChecks, activeChecks);

            await Promise.resolve();

            activeChecks -= 1;
            return { id: "test-account-id" };
        };

        await Promise.all([
            limiter.runAttempt(EMAIL, IP, verify),
            limiter.runAttempt(pair.email, pair.ip, verify),
        ]);

        expect(maximumActiveChecks).toBe(2);
    });

    it("shares the queue and limit across normalized email variants", async () => {
        const verify = vi.fn(async () => {
            await Promise.resolve();
            return null;
        });

        const results = await Promise.allSettled(
            Array.from({ length: 6 }, (_, index) =>
                limiter.runAttempt(index % 2 === 0 ? EMAIL : "  OLENA@EXAMPLE.COM  ", IP, verify),
            ),
        );

        expect(verify).toHaveBeenCalledTimes(5);
        expect(results[5]).toMatchObject({
            status: "rejected",
            reason: {
                status: 429,
                code: "TOO_MANY_ATTEMPTS",
            },
        });
    });

    it("does not invoke verification when the pair is already blocked", async () => {
        for (let index = 0; index < 5; index += 1) {
            limiter.recordFailure(EMAIL, IP);
        }

        const verify = vi.fn(async () => ({ id: "test-account-id" }));

        await expect(limiter.runAttempt(EMAIL, IP, verify)).rejects.toMatchObject({
            status: 429,
            code: "TOO_MANY_ATTEMPTS",
            retryAfterSeconds: 300,
        });

        expect(verify).not.toHaveBeenCalled();
    });

    it("continues the queue after a technical error without counting it as a failure", async () => {
        limiter = new AuthRateLimitService({ maxAttempts: 1, windowMs: 300_000 }, () => now);
        const technicalError = new Error("Database unavailable");
        const verify = vi.fn(async () => null);

        const results = await Promise.allSettled([
            limiter.runAttempt(EMAIL, IP, async () => {
                throw technicalError;
            }),
            limiter.runAttempt(EMAIL, IP, verify),
        ]);

        expect(results[0]).toMatchObject({
            status: "rejected",
            reason: technicalError,
        });
        expect(results[1]).toMatchObject({
            status: "rejected",
            reason: {
                status: 401,
                code: "UNAUTHORIZED",
            },
        });
        expect(verify).toHaveBeenCalledTimes(1);
        expect(limiter.getRetryAfterSeconds(EMAIL, IP)).toBe(300);
    });

    it("allows a successful attempt after the lockout expires", async () => {
        await Promise.allSettled(
            Array.from({ length: 5 }, () => limiter.runAttempt(EMAIL, IP, async () => null)),
        );

        const verify = vi.fn(async () => ({ id: "test-account-id" }));

        await expect(limiter.runAttempt(EMAIL, IP, verify)).rejects.toMatchObject({ status: 429 });

        expect(verify).not.toHaveBeenCalled();

        now = 300_000;

        await expect(limiter.runAttempt(EMAIL, IP, verify)).resolves.toEqual({
            id: "test-account-id",
        });

        expect(verify).toHaveBeenCalledTimes(1);
    });

    it("does not erase recent failures after a successful attempt", async () => {
        for (let index = 0; index < 4; index += 1) {
            limiter.recordFailure(EMAIL, IP);
        }

        await limiter.runAttempt(EMAIL, IP, async () => ({
            id: "test-account-id",
        }));

        await expect(limiter.runAttempt(EMAIL, IP, async () => null)).rejects.toMatchObject({
            status: 401,
        });

        await expect(
            limiter.runAttempt(EMAIL, IP, async () => ({
                id: "test-account-id",
            })),
        ).rejects.toMatchObject({ status: 429 });
    });
});
