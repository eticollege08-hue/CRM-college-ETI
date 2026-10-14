import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "../../src/modules/auth/auth.service.js";
import { AuthRateLimitService } from "../../src/modules/auth/auth-rate-limit.service.js";

import type {
    AuthAccount,
    AuthPasswords,
    AuthTokenIssuer,
    AuthUserAccounts,
} from "../../src/modules/auth/auth.types.js";

const input = { email: "  OLENA@EXAMPLE.COM  ", password: "test-password" };
const account: AuthAccount = {
    id: "account-id",
    passwordHash: "stored-hash",
    isActive: true,
    role: "OWNER",
};

describe("AuthService", () => {
    let now: number;
    let find: ReturnType<typeof vi.fn<AuthUserAccounts["findForAuthentication"]>>;
    let update: ReturnType<typeof vi.fn<AuthUserAccounts["updateLastLoginAt"]>>;
    let issue: ReturnType<typeof vi.fn<AuthTokenIssuer["issue"]>>;
    let hash: ReturnType<typeof vi.fn<AuthPasswords["hash"]>>;
    let verify: ReturnType<typeof vi.fn<AuthPasswords["verify"]>>;
    let service: AuthService;

    beforeEach(() => {
        now = 0;
        find = vi.fn<AuthUserAccounts["findForAuthentication"]>().mockResolvedValue(account);
        update = vi.fn<AuthUserAccounts["updateLastLoginAt"]>().mockResolvedValue(undefined);
        issue = vi.fn<AuthTokenIssuer["issue"]>().mockResolvedValue("test-token");
        hash = vi.fn<AuthPasswords["hash"]>().mockResolvedValue("dummy-hash");
        verify = vi.fn<AuthPasswords["verify"]>().mockResolvedValue(true);
        service = new AuthService(
            { findForAuthentication: find, updateLastLoginAt: update },
            { issue },
            new AuthRateLimitService({ maxAttempts: 5, windowMs: 300_000 }, () => now),
            { hash, verify },
            () => new Date(now),
        );
    });

    it("normalizes email, verifies the hash, issues only account claims and updates last login", async () => {
        const result = await service.login(input, "192.0.2.1");
        expect(find).toHaveBeenCalledWith("olena@example.com");
        expect(verify).toHaveBeenCalledWith(input.password, account.passwordHash);
        expect(issue).toHaveBeenCalledExactlyOnceWith(
            { userId: "account-id", role: "OWNER" },
            3600,
        );
        expect(update).toHaveBeenCalledExactlyOnceWith("account-id", new Date(0));
        expect(result).toEqual({ token: "test-token", expiresIn: 3600 });
    });

    it.each(["missing email", "employee without account", "wrong password", "inactive account"])(
        "uses an identical 401 for %s",
        async (scenario) => {
            if (scenario === "missing email" || scenario === "employee without account")
                find.mockResolvedValue(null);
            if (scenario === "wrong password") verify.mockResolvedValue(false);
            if (scenario === "inactive account")
                find.mockResolvedValue({ ...account, isActive: false });
            await expect(service.login(input, "192.0.2.1")).rejects.toMatchObject({
                status: 401,
                code: "UNAUTHORIZED",
                message: "Invalid email or password.",
                details: [],
            });
            expect(verify).toHaveBeenCalledTimes(1);
            expect(issue).not.toHaveBeenCalled();
            expect(update).not.toHaveBeenCalled();
        },
    );

    it("performs a dummy hash comparison for missing accounts and caches the dummy hash", async () => {
        find.mockResolvedValue(null);
        await Promise.allSettled([
            service.login(input, "192.0.2.1"),
            service.login(input, "192.0.2.2"),
        ]);
        expect(hash).toHaveBeenCalledTimes(1);
        expect(verify).toHaveBeenCalledWith(input.password, "dummy-hash");
        expect(find).toHaveBeenCalledTimes(2);
    });

    it("limits concurrent failures before querying accounts and resumes after the window", async () => {
        verify.mockResolvedValue(false);
        const results = await Promise.allSettled(
            Array.from({ length: 8 }, () => service.login(input, "192.0.2.1")),
        );
        expect(find).toHaveBeenCalledTimes(5);
        expect(verify).toHaveBeenCalledTimes(5);
        expect(results[5]).toMatchObject({
            status: "rejected",
            reason: { status: 429, retryAfterSeconds: 300 },
        });
        now = 300_000;
        verify.mockResolvedValue(true);
        await expect(service.login(input, "192.0.2.1")).resolves.toEqual({
            token: "test-token",
            expiresIn: 3600,
        });
    });

    it("does not count account service failures as wrong credentials", async () => {
        const error = new Error("Upstream failure");
        find.mockRejectedValueOnce(error);
        await expect(service.login(input, "192.0.2.1")).rejects.toBe(error);
        await expect(service.login(input, "192.0.2.1")).resolves.toMatchObject({ expiresIn: 3600 });
    });

    it("does not return a token if updating last login fails", async () => {
        update.mockRejectedValue(new Error("Update failed"));
        await expect(service.login(input, "192.0.2.1")).rejects.toThrow("Update failed");
    });

    it("rejects an empty issued token before updating last login", async () => {
        issue.mockResolvedValue("");
        await expect(service.login(input, "192.0.2.1")).rejects.toThrow(
            "Token issuer returned an empty token.",
        );
        expect(update).not.toHaveBeenCalled();
    });
});
