import { describe, expect, it, vi } from "vitest";

import { EventController } from "../../src/modules/events/event.controller.js";

import type { Request, Response } from "express";
import type { EventService } from "../../src/modules/events/event.service.js";

vi.mock("#config/prisma.config.js", () => ({ default: {} }));

const id = "550e8400-e29b-41d4-a716-446655440000";
const actorId = "550e8400-e29b-41d4-a716-446655440001";

describe("EventController", () => {
    it("responds with 201 and the event, passing the JWT account ID rather than client ownership", async () => {
        const event = { id };
        const create = vi.fn().mockResolvedValue(event);
        const controller = new EventController({ create } as unknown as EventService);
        const req = {
            body: { title: "Planning" },
            user: { userId: actorId },
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await controller.create(req, res as unknown as Response);
        expect(create).toHaveBeenCalledWith(req.body, actorId);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Event created successfully.",
            event,
        });
    });
    it("deletes with the exact confirmation and returns a JSON 200, not 204", async () => {
        const remove = vi.fn();
        const controller = new EventController({ delete: remove } as unknown as EventService);
        const req = {
            params: { id },
            body: { confirmationTitle: "Planning" },
            user: { userId: actorId },
        } as unknown as Request;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await controller.delete(req, res as unknown as Response);
        expect(remove).toHaveBeenCalledWith(id, "Planning", actorId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Event deleted successfully.",
        });
    });
    it("does not call the service for an invalid list query", async () => {
        const getRange = vi.fn();
        const controller = new EventController({ getRange } as unknown as EventService);
        await expect(
            controller.getAll({ query: {} } as Request, {} as Response),
        ).rejects.toBeDefined();
        expect(getRange).not.toHaveBeenCalled();
    });
});
