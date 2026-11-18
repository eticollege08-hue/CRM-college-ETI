import { describe, expect, it, vi } from "vitest";

import { HttpStatus } from "#constants/http-status.constants.js";
import { PROJECT_MESSAGES } from "../../src/modules/projects/projects.constants.js";
import { projectsController } from "../../src/modules/projects/projects.controller.js";
import router from "../../src/modules/projects/projects.router.js";

import type { NextFunction, Request, RequestHandler, Response } from "express";

vi.mock("../../src/modules/projects/projects.controller.js", () => ({
    projectsController: {
        getAll: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

describe("projects router", () => {
    const deleteLayer = router.stack.find(
        (entry) =>
            entry.route?.path === "/:id" &&
            (entry.route as unknown as { methods?: Record<string, boolean> })?.methods?.delete,
    );
    const handlers = (deleteLayer?.route?.stack ?? []).map(
        (entry) => entry.handle as RequestHandler,
    );

    it("registers accessFor, param validation, body validation, and controller handler on DELETE /:id", () => {
        // accessFor + validateParams + validateDeleteProject + asyncCatch(controller)
        expect(handlers).toHaveLength(4);
    });

    describe("validateDeleteProject middleware", () => {
        // handlers[0] = accessFor, handlers[1] = validateParams, handlers[2] = validateDeleteProject
        const validateDelete = handlers[2]!;

        it("calls next() with valid confirmName and trims leading and trailing spaces", () => {
            const req = { body: { confirmName: "  Test Project  " } } as Request;
            const res = {} as Response;
            const next = vi.fn();

            validateDelete(req, res, next as unknown as NextFunction);

            expect(next).toHaveBeenCalledWith();
            expect(req.body).toEqual({ confirmName: "Test Project" });
        });

        it("passes ApiError 400 when body is missing or not an object", () => {
            const next = vi.fn();
            validateDelete(
                { body: null } as Request,
                {} as Response,
                next as unknown as NextFunction,
            );
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: HttpStatus.BAD_REQUEST,
                    message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED,
                }),
            );

            next.mockReset();
            validateDelete(
                { body: [1, 2] } as unknown as Request,
                {} as Response,
                next as unknown as NextFunction,
            );
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: HttpStatus.BAD_REQUEST,
                    message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED,
                }),
            );
        });

        it("passes ApiError 400 when confirmName is missing, empty, or non-string", () => {
            const testCases = [
                {},
                { confirmName: "" },
                { confirmName: "   " },
                { confirmName: 123 },
                { confirmName: null },
                { confirmName: true },
                { confirmName: "CRM", extra: 1 },
            ];

            for (const body of testCases) {
                const next = vi.fn();
                validateDelete(
                    { body } as Request,
                    {} as Response,
                    next as unknown as NextFunction,
                );

                expect(next).toHaveBeenCalledWith(
                    expect.objectContaining({
                        status: HttpStatus.BAD_REQUEST,
                        message: PROJECT_MESSAGES.CONFIRM_NAME_REQUIRED,
                    }),
                );
            }
        });
    });

    describe("DELETE route controller delegation", () => {
        it("delegates to projectsController.delete", async () => {
            vi.mocked(projectsController.delete).mockResolvedValue(undefined as never);
            // handlers[3] = asyncCatch(controller)
            const controllerHandler = handlers[3]!;
            const req = {
                params: { id: "550e8400-e29b-41d4-a716-446655440000" },
                body: { confirmName: "CRM" },
            } as unknown as Request;
            const res = {} as Response;
            const next = vi.fn();

            await controllerHandler(req, res, next as unknown as NextFunction);

            expect(projectsController.delete).toHaveBeenCalledWith(
                req,
                res,
                next as unknown as NextFunction,
            );
        });
    });
});
