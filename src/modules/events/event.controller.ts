import { HttpStatus } from "#constants/http-status.constants.js";
import { uuidSchema } from "#schemas/id.schema.js";
import { getAuthUser } from "#utils/auth-user.util.js";

import { EVENT_MESSAGES } from "./event.constants.js";
import { eventListSchema, eventParticipantParamsSchema } from "./event.schema.js";
import { eventService } from "./event.service.js";

import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { EventService } from "./event.service.js";
import type {
    EventActor,
    EventCreateInput,
    EventUpdateInput,
    EventDeleteInput,
    EventParticipantsInput,
} from "./event.types.js";

export class EventController {
    constructor(private readonly service: EventService = eventService) {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.addParticipants = this.addParticipants.bind(this);
        this.removeParticipant = this.removeParticipant.bind(this);
    }

    private actor(req: Request): EventActor {
        const { userId, companyId } = getAuthUser(req);
        return { accountId: userId, companyId };
    }

    async getAll(req: Request, res: Response) {
        const query = eventListSchema.parse(req.query);
        const events = await this.service.getRange(query, this.actor(req).companyId);
        res.status(HttpStatus.OK).json({ success: true, events });
    }

    async getById(req: Request, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const event = await this.service.getById(id, this.actor(req).companyId);
        res.status(HttpStatus.OK).json({ success: true, event });
    }

    async create(req: Request<ParamsDictionary, unknown, EventCreateInput>, res: Response) {
        const event = await this.service.create(req.body, this.actor(req));
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: EVENT_MESSAGES.CREATED,
            event,
        });
    }

    async update(req: Request<ParamsDictionary, unknown, EventUpdateInput>, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        const event = await this.service.update(id, req.body, this.actor(req));
        res.status(HttpStatus.OK).json({ success: true, message: EVENT_MESSAGES.UPDATED, event });
    }

    async delete(req: Request<ParamsDictionary, unknown, EventDeleteInput>, res: Response) {
        const { id } = uuidSchema.parse(req.params);
        await this.service.delete(id, req.body.confirmationTitle, this.actor(req));
        res.status(HttpStatus.OK).json({ success: true, message: EVENT_MESSAGES.DELETED });
    }

    async addParticipants(
        req: Request<ParamsDictionary, unknown, EventParticipantsInput>,
        res: Response,
    ) {
        const { id } = uuidSchema.parse(req.params);
        const event = await this.service.addParticipants(
            id,
            req.body.participantIds,
            this.actor(req),
        );
        res.status(HttpStatus.OK).json({
            success: true,
            message: EVENT_MESSAGES.PARTICIPANTS_UPDATED,
            event,
        });
    }

    async removeParticipant(req: Request, res: Response) {
        const { id, employeeId } = eventParticipantParamsSchema.parse(req.params);
        const event = await this.service.removeParticipant(id, employeeId, this.actor(req));
        res.status(HttpStatus.OK).json({
            success: true,
            message: EVENT_MESSAGES.PARTICIPANTS_UPDATED,
            event,
        });
    }
}

export const eventController = new EventController();
