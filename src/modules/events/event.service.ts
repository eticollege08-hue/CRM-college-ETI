import { HttpStatus } from "#constants/http-status.constants.js";
import { userAccountRepository } from "#modules/user-accounts/user-account.repository.js";
import { ApiError } from "#utils/error.util.js";
import { dayBounds, validEventRange } from "#utils/event-time.util.js";

import { EVENT_MESSAGES } from "./event.constants.js";
import { eventRepository } from "./event.repository.js";

import type { Prisma } from "@prisma/client";
import type { UserAccountRepository } from "#modules/user-accounts/user-account.repository.js";
import type { EventRepository } from "./event.repository.js";
import type {
    EventCreateInput,
    EventUpdateInput,
    EventListInput,
    EventWrite,
} from "./event.types.js";

type StoredEvent = NonNullable<Awaited<ReturnType<EventRepository["getById"]>>>;

export class EventService {
    constructor(
        private readonly repository: EventRepository = eventRepository,
        private readonly accounts: UserAccountRepository = userAccountRepository,
    ) {}

    async getRange(query: EventListInput) {
        if (query.date) {
            const { from, to } = dayBounds(query.date, query.timeZone);
            return await this.repository.getRange(from, to);
        }
        // HTTP and SSR validate the query before reaching this service.
        if (!query.from || !query.to)
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Provide date or both from and to.",
            );
        return await this.repository.getRange(new Date(query.from), new Date(query.to));
    }

    async getById(id: string, tx?: Prisma.TransactionClient) {
        const event = await this.repository.getById(id, tx);
        if (!event) throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.NOT_FOUND);
        return event;
    }

    async create(input: EventCreateInput, actorId: string) {
        const account = await this.accounts.getById(actorId);
        if (!account?.isActive)
            throw new ApiError(HttpStatus.UNAUTHORIZED, EVENT_MESSAGES.ACCOUNT_UNAVAILABLE);
        const { participantIds, startsAt, endsAt, ...fields } = input;
        const data = { ...fields, startsAt: new Date(startsAt), endsAt: new Date(endsAt) };
        return await this.repository.transaction(async (tx) => {
            await this.checkSchedule(data, participantIds, tx);
            return await this.repository.create(actorId, data, participantIds, tx);
        });
    }

    async update(id: string, input: EventUpdateInput, actorId: string) {
        return await this.repository.transaction(async (tx) => {
            const event = await this.ownedEvent(id, actorId, tx);
            const data = this.updatedFields(event, input);
            const ids = input.participantIds ?? this.participantIds(event);
            await this.checkSchedule(data, ids, tx, id);
            return await this.repository.update(id, data, ids, tx);
        });
    }

    async delete(id: string, confirmationTitle: string, actorId: string) {
        await this.repository.transaction(async (tx) => {
            const event = await this.ownedEvent(id, actorId, tx);
            if (confirmationTitle !== event.title) {
                throw new ApiError(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    EVENT_MESSAGES.CONFIRMATION_MISMATCH,
                    [{ field: "confirmationTitle", message: EVENT_MESSAGES.CONFIRMATION_MISMATCH }],
                );
            }
            await this.repository.delete(id, tx);
        });
    }

    async addParticipants(id: string, participantIds: string[], actorId: string) {
        return await this.repository.transaction(async (tx) => {
            const event = await this.ownedEvent(id, actorId, tx);
            const ids = [...new Set([...this.participantIds(event), ...participantIds])];
            const data = this.updatedFields(event, {});
            await this.checkSchedule(data, ids, tx, id);
            return await this.repository.update(id, data, ids, tx);
        });
    }

    async removeParticipant(id: string, employeeId: string, actorId: string) {
        return await this.repository.transaction(async (tx) => {
            const event = await this.ownedEvent(id, actorId, tx);
            const before = this.participantIds(event);
            if (!before.includes(employeeId))
                throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.NOT_PARTICIPANT);
            const ids = before.filter((value) => value !== employeeId);
            const data = this.updatedFields(event, {});
            await this.checkSchedule(data, ids, tx, id);
            return await this.repository.update(id, data, ids, tx);
        });
    }

    private async ownedEvent(id: string, actorId: string, tx: Prisma.TransactionClient) {
        const event = await this.getById(id, tx);
        if (event.ownerAccountId !== actorId)
            throw new ApiError(HttpStatus.FORBIDDEN, EVENT_MESSAGES.NOT_OWNER);
        return event;
    }

    private participantIds(event: StoredEvent) {
        return event.participants.map(({ employee }) => employee.id);
    }

    private updatedFields(event: StoredEvent, input: EventUpdateInput): EventWrite {
        return {
            type: input.type ?? event.type,
            title: input.title ?? event.title,
            description: input.description ?? event.description,
            timeZone: input.timeZone ?? event.timeZone,
            startsAt: input.startsAt === undefined ? event.startsAt : new Date(input.startsAt),
            endsAt: input.endsAt === undefined ? event.endsAt : new Date(input.endsAt),
        };
    }

    private async checkSchedule(
        data: EventWrite,
        ids: string[],
        tx: Prisma.TransactionClient,
        excludeId?: string,
    ) {
        if (!validEventRange(data.startsAt, data.endsAt, data.timeZone)) {
            throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, EVENT_MESSAGES.DATE_RANGE, [
                { field: "endsAt", message: EVENT_MESSAGES.DATE_RANGE },
            ]);
        }
        if (ids.length < 1 || ids.length > 200) {
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "An event must have between 1 and 200 participants.",
                [{ field: "participantIds", message: "Choose between 1 and 200 employees." }],
            );
        }
        const employees = await this.repository.getEmployees(ids, tx);
        if (employees.length !== ids.length) {
            throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.EMPLOYEE_NOT_FOUND);
        }
        if (await this.repository.hasConflict(ids, data.startsAt, data.endsAt, tx, excludeId)) {
            throw new ApiError(HttpStatus.CONFLICT, EVENT_MESSAGES.CONFLICT);
        }
    }
}

export const eventService = new EventService();
