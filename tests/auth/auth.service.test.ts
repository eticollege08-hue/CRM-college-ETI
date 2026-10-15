import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "../../src/modules/auth/auth.service.js";
import { AuthRateLimitService } from "../../src/services/auth-rate-limit.service.js";
import { hashPassword, verifyPassword } from "../../src/utils/password.util.js";
import { generateToken } from "../../src/utils/jwt.util.js";

import type { UserAccountService } from "../../src/modules/user-accounts/user-account.service.js";

vi.mock("#modules/user-accounts/user-account.service.js", () => ({ userAccountService: {} }));
vi.mock("#utils/password.util.js", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));
vi.mock("#utils/jwt.util.js", () => ({ generateToken: vi.fn() }));

const input = { email: "  OLENA@EXAMPLE.COM  ", password: "test-password" };
const account = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    employeeId: "550e8400-e29b-41d4-a716-446655440001",
    email: "olena@example.com",
    passwordHash: "stored-hash",
    roleKey: "OWNER" as const,
    isActive: true,
    lastLoginAt: null,
};

describe("AuthService", () => {
    let accounts: {
        getByEmail: ReturnType<typeof vi.fn<UserAccountService["getByEmail"]>>;
        updateLastLoginAt: ReturnType<typeof vi.fn<UserAccountService["updateLastLoginAt"]>>;
    };
    let service: AuthService;
    let limiter: AuthRateLimitService;

    beforeEach(() => {
        accounts = {
            getByEmail: vi.fn<UserAccountService["getByEmail"]>().mockResolvedValue(account),
            updateLastLoginAt: vi
                .fn<UserAccountService["updateLastLoginAt"]>()
                .mockResolvedValue(account),
        };
        vi.mocked(hashPassword).mockResolvedValue("dummy-hash");
        vi.mocked(verifyPassword).mockResolvedValue(true);
        vi.mocked(generateToken).mockReturnValue("test-token");
        limiter = new AuthRateLimitService({ maxAttempts: 5, windowMs: 300_000 });
        service = new AuthService(accounts as unknown as UserAccountService, limiter);
    });

    it("normalizes email, signs account claims, updates last_login_at and returns only the internal token", async () => {
        await expect(service.login(input, "192.0.2.1")).resolves.toBe("test-token");
        expect(accounts.getByEmail).toHaveBeenCalledWith("olena@example.com");
        expect(verifyPassword).toHaveBeenCalledWith(input.password, account.passwordHash);
        expect(generateToken).toHaveBeenCalledExactlyOnceWith({
            userId: account.id,
            role: account.roleKey,
        });
        expect(accounts.updateLastLoginAt).toHaveBeenCalledExactlyOnceWith(account.id);
    });

    it.each(["missing account", "wrong password", "inactive account"])(
        "returns the same generic 401 for %s",
        async (scenario) => {
            if (scenario === "missing account") accounts.getByEmail.mockResolvedValue(null);
            if (scenario === "wrong password") vi.mocked(verifyPassword).mockResolvedValue(false);
            if (scenario === "inactive account")
                accounts.getByEmail.mockResolvedValue({ ...account, isActive: false });
            await expect(service.login(input, "192.0.2.1")).rejects.toMatchObject({
                status: 401,
                message: "Invalid email or password.",
                details: [],
            });
            expect(verifyPassword).toHaveBeenCalledTimes(1);
            expect(generateToken).not.toHaveBeenCalled();
            expect(accounts.updateLastLoginAt).not.toHaveBeenCalled();
        },
    );

    it("compares against the cached dummy bcrypt hash for missing accounts", async () => {
        accounts.getByEmail.mockResolvedValue(null);
        await Promise.allSettled([
            service.login(input, "192.0.2.1"),
            service.login(input, "192.0.2.2"),
        ]);
        expect(hashPassword).toHaveBeenCalledTimes(1);
        expect(verifyPassword).toHaveBeenCalledWith(input.password, "dummy-hash");
    });

    it("delegates the normalized identity to the shared limiter", async () => {
        const run = vi.spyOn(limiter, "runAttempt");
        await service.login(input, "192.0.2.1");
        expect(run).toHaveBeenCalledWith("olena@example.com", "192.0.2.1", expect.any(Function));
    });

    it("rejects the sixth concurrent failure without querying or comparing again", async () => {
        vi.mocked(verifyPassword).mockResolvedValue(false);
        const results = await Promise.allSettled(
            Array.from({ length: 6 }, () => service.login(input, "192.0.2.1")),
        );
        expect(accounts.getByEmail).toHaveBeenCalledTimes(5);
        expect(verifyPassword).toHaveBeenCalledTimes(5);
        expect(results[5]).toMatchObject({
            status: "rejected",
            reason: {
                status: 429,
                message: "Too many attempts. Please try again later.",
                details: [],
            },
        });
    });

    it("does not return a login result when updating last_login_at fails", async () => {
        const failure = new Error("Database failure");
        accounts.updateLastLoginAt.mockRejectedValueOnce(failure);
        await expect(service.login(input, "192.0.2.1")).rejects.toBe(failure);
        expect(limiter.isBlocked(input.email, "192.0.2.1")).toBe(false);
    });

    it("does not update last_login_at when signing fails", async () => {
        vi.mocked(generateToken).mockImplementationOnce(() => {
            throw new Error("Signing failed");
        });
        await expect(service.login(input, "192.0.2.1")).rejects.toThrow("Signing failed");
        expect(accounts.updateLastLoginAt).not.toHaveBeenCalled();
    });

    it("does not count infrastructure failures as incorrect credentials", async () => {
        const failure = new Error("Database unavailable");
        accounts.getByEmail.mockRejectedValueOnce(failure);
        await expect(service.login(input, "192.0.2.1")).rejects.toBe(failure);
        await expect(service.login(input, "192.0.2.1")).resolves.toBe("test-token");
    });
});
