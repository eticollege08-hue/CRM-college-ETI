import { describe, expect, it, vi } from "vitest";

import { accessFor } from "../../src/middlewares/access.middleware.js";
import { ApiError } from "../../src/utils/error.util.js";

import type { Role } from "@prisma/client";
import type { Request, Response } from "express";

function createContext(role: unknown) {
    const req = {
        user: {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            role,
            exp: 2000000000,
        },
    } as unknown as Request;
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    return { req, res, next };
}

describe("accessFor", () => {
    it.each<Role>(["OWNER", "WORKER"])(
        "allows a listed role without reading cookies: %s",
        (role) => {
            const { req, res, next } = createContext(role);

            accessFor(["OWNER", "WORKER"])(req, res as unknown as Response, next);

            expect(next).toHaveBeenCalledExactlyOnceWith();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
            expect(res.clearCookie).not.toHaveBeenCalled();
        },
    );

    it.each<{ role: unknown; roles: Role[] }>([
        { role: "MANAGER", roles: ["OWNER", "WORKER"] },
        { role: "OWNER", roles: [] },
        { role: undefined, roles: ["OWNER"] },
        { role: "UNKNOWN", roles: ["OWNER"] },
        { role: ["OWNER"], roles: ["OWNER"] },
    ])("forwards 403 for a disallowed/missing role or empty list: %j", ({ role, roles }) => {
        const { req, res, next } = createContext(role);

        accessFor(roles)(req, res as unknown as Response, next);

        expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 403,
                message: "You do not have permission to perform this action.",
                details: [],
            }),
        );
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(res.clearCookie).not.toHaveBeenCalled();
    });

    it("denies access without req.user even when a cookie exists", () => {
        const { req, res, next } = createContext("OWNER");
        delete req.user;
        req.cookies = { crm_access_token: "test-cookie" };

        accessFor(["OWNER"])(req, res as unknown as Response, next);

        expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
        expect(res.clearCookie).not.toHaveBeenCalled();
    });
});
