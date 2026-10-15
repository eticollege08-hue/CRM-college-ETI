import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRateLimitService } from "../../src/services/auth-rate-limit.service.js";

const EMAIL = "olena@example.com";
const IP = "192.0.2.1";

describe("AuthRateLimitService", () => {
    let now: number;
    let limiter: AuthRateLimitService;
    beforeEach(() => {
        now = 0;
        limiter = new AuthRateLimitService({ maxAttempts: 5, windowMs: 300_000 }, () => now);
    });
    function fail(count: number) {
        for (let i = 0; i < count; i += 1) limiter.recordFailure(EMAIL, IP);
    }

    it("blocks only after five failed attempts", () => {
        expect(limiter.isBlocked(EMAIL, IP)).toBe(false);
        fail(4);
        expect(limiter.isBlocked(EMAIL, IP)).toBe(false);
        fail(1);
        expect(limiter.isBlocked(EMAIL, IP)).toBe(true);
    });
    it("isolates email + IP pairs and normalizes email", () => {
        fail(5);
        expect(limiter.isBlocked("  OLENA@EXAMPLE.COM  ", IP)).toBe(true);
        expect(limiter.isBlocked(EMAIL, "192.0.2.2")).toBe(false);
        expect(limiter.isBlocked("ivan@example.com", IP)).toBe(false);
    });
    it("expires failures exactly at the sliding window boundary", () => {
        fail(1);
        now = 100_000;
        fail(4);
        now = 300_000;
        expect(limiter.isBlocked(EMAIL, IP)).toBe(false);
        fail(1);
        expect(limiter.isBlocked(EMAIL, IP)).toBe(true);
        now = 400_000;
        expect(limiter.isBlocked(EMAIL, IP)).toBe(false);
    });
    it("does not extend a lockout for blocked requests", async () => {
        fail(5);
        now = 100_000;
        const verify = vi.fn(async () => null);
        await expect(limiter.runAttempt(EMAIL, IP, verify)).rejects.toMatchObject({ status: 429 });
        limiter.recordFailure(EMAIL, IP);
        expect(verify).not.toHaveBeenCalled();
        now = 300_000;
        await expect(limiter.runAttempt(EMAIL, IP, async () => "signed-in")).resolves.toBe(
            "signed-in",
        );
    });
    it("runs only five credential checks for concurrent failures", async () => {
        const verify = vi.fn(async () => {
            await Promise.resolve();
            return null;
        });
        const results = await Promise.allSettled(
            Array.from({ length: 10 }, () => limiter.runAttempt(EMAIL, IP, verify)),
        );
        expect(verify).toHaveBeenCalledTimes(5);
        expect(results.slice(0, 5)).toEqual(
            Array.from({ length: 5 }, () =>
                expect.objectContaining({
                    status: "rejected",
                    reason: expect.objectContaining({ status: 401 }),
                }),
            ),
        );
        expect(results.slice(5)).toEqual(
            Array.from({ length: 5 }, () =>
                expect.objectContaining({
                    status: "rejected",
                    reason: expect.objectContaining({ status: 429 }),
                }),
            ),
        );
    });
    it("serializes checks of a normalized pair", async () => {
        let active = 0;
        let maximum = 0;
        const verify = async () => {
            active += 1;
            maximum = Math.max(maximum, active);
            await Promise.resolve();
            active -= 1;
            return "ok";
        };
        await Promise.all([
            limiter.runAttempt(EMAIL, IP, verify),
            limiter.runAttempt("  OLENA@EXAMPLE.COM  ", IP, verify),
        ]);
        expect(maximum).toBe(1);
    });
    it("allows different pairs to execute concurrently", async () => {
        let active = 0;
        let maximum = 0;
        const verify = async () => {
            active += 1;
            maximum = Math.max(maximum, active);
            await Promise.resolve();
            active -= 1;
            return "ok";
        };
        await Promise.all([
            limiter.runAttempt(EMAIL, IP, verify),
            limiter.runAttempt(EMAIL, "192.0.2.2", verify),
        ]);
        expect(maximum).toBe(2);
    });
    it("continues the queue after technical failures without counting them", async () => {
        limiter = new AuthRateLimitService({ maxAttempts: 1, windowMs: 1000 }, () => now);
        const failure = new Error("Database failed");
        const results = await Promise.allSettled([
            limiter.runAttempt(EMAIL, IP, async () => {
                throw failure;
            }),
            limiter.runAttempt(EMAIL, IP, async () => null),
        ]);
        expect(results[0]).toEqual({ status: "rejected", reason: failure });
        expect(results[1]).toMatchObject({ status: "rejected", reason: { status: 401 } });
    });
    it("successful logins neither add nor clear previous failures", async () => {
        fail(4);
        await limiter.runAttempt(EMAIL, IP, async () => "ok");
        expect(limiter.isBlocked(EMAIL, IP)).toBe(false);
        await expect(limiter.runAttempt(EMAIL, IP, async () => null)).rejects.toMatchObject({
            status: 401,
        });
        expect(limiter.isBlocked(EMAIL, IP)).toBe(true);
    });
    it("uses configured limits and clears expired identities", () => {
        limiter = new AuthRateLimitService({ maxAttempts: 2, windowMs: 1000 }, () => now);
        fail(2);
        expect(limiter.isBlocked(EMAIL, IP)).toBe(true);
        now = 1000;
        limiter.recordFailure("other@example.com", IP);
        expect(limiter.isBlocked(EMAIL, IP)).toBe(false);
    });
});
