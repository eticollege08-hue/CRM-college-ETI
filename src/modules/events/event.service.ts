import { randomUUID } from "node:crypto";

import { HttpStatus } from "#constants/http-status.constants.js";
import { userAccountRepository } from "#modules/user-accounts/user-account.repository.js";
import { googleCalendarService } from "#services/google-calendar.service.js";
import { ApiError } from "#utils/error.util.js";
import { dayBounds, validEventRange } from "#utils/event-time.util.js";

import { EVENT_MESSAGES } from "./event.constants.js";
import { eventRepository } from "./event.repository.js";

import type { Prisma } from "@prisma/client";
import type { UserAccountRepository } from "#modules/user-accounts/user-account.repository.js";
import type {
    GoogleCalendarEventBody,
    GoogleCalendarService,
} from "#services/google-calendar.service.js";
import type { EventRepository } from "./event.repository.js";
import type {
    EventActor,
    EventCreateInput,
    EventUpdateInput,
    EventListInput,
    EventWrite,
} from "./event.types.js";

type StoredEvent = NonNullable<Awaited<ReturnType<EventRepository["getById"]>>>;
type SetUndo = (undo: () => Promise<void>) => void;

// Google event IDs allow only base32hex characters; a UUID without dashes always fits.
export function toGoogleEventId(eventId: string): string {
    return eventId.replace(/-/g, "").toLowerCase();
}

export class EventService {
    constructor(
        private readonly repository: EventRepository = eventRepository,
        private readonly accounts: UserAccountRepository = userAccountRepository,
        private readonly calendar: GoogleCalendarService = googleCalendarService,
    ) {}

    async getRange(query: EventListInput, companyId: string) {
        if (query.date) {
            const { from, to } = dayBounds(query.date, query.timeZone);
            return await this.repository.getRange(from, to, companyId);
        }
        // HTTP and SSR validate the query before reaching this service.
        if (!query.from || !query.to)
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Provide date or both from and to.",
            );
        return await this.repository.getRange(new Date(query.from), new Date(query.to), companyId);
    }

    async getParticipantEventsToday(employeeId: string, now = new Date()) {
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);

        return await this.repository.getParticipantRange(employeeId, from, to);
    }

    async getById(id: string, companyId: string, tx?: Prisma.TransactionClient) {
        const event = await this.repository.getById(id, companyId, tx);
        if (!event) throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.NOT_FOUND);
        return event;
    }

    async create(input: EventCreateInput, actor: EventActor) {
        const account = await this.accounts.getById(actor.accountId);

        if (!account?.isActive || account.companyId !== actor.companyId)
            throw new ApiError(HttpStatus.UNAUTHORIZED, EVENT_MESSAGES.ACCOUNT_UNAVAILABLE);

        const { participantIds, startsAt, endsAt, ...fields } = input;
        const data = { ...fields, startsAt: new Date(startsAt), endsAt: new Date(endsAt) };

        const id = randomUUID();
        const googleEventId = this.calendar.isEnabled() ? toGoogleEventId(id) : null;

        return await this.mutate(async (tx, setUndo) => {
            await this.checkSchedule(data, participantIds, actor.companyId, tx);
            const created = await this.repository.create(
                id,
                actor.accountId,
                actor.companyId,
                { ...data, googleEventId },
                participantIds,
                tx,
            );
            if (googleEventId) {
                await this.calendar.insertEvent(
                    googleEventId,
                    await this.toGoogleEvent(created, tx),
                );
                setUndo(() => this.calendar.deleteEvent(googleEventId));
            }
            return created;
        });
    }

    async update(id: string, input: EventUpdateInput, actor: EventActor) {
        return await this.mutate(async (tx, setUndo) => {
            const event = await this.ownedEvent(id, actor, tx);
            const data = this.updatedFields(event, input);
            const ids = input.participantIds ?? this.participantIds(event);
            return await this.save(event, data, ids, tx, setUndo);
        });
    }

    async delete(id: string, confirmationTitle: string, actor: EventActor) {
        await this.mutate(async (tx, setUndo) => {
            const event = await this.ownedEvent(id, actor, tx);
            if (confirmationTitle !== event.title) {
                throw new ApiError(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    EVENT_MESSAGES.CONFIRMATION_MISMATCH,
                    [{ field: "confirmationTitle", message: EVENT_MESSAGES.CONFIRMATION_MISMATCH }],
                );
            }
            const { googleEventId } = event;
            const restore =
                googleEventId && this.calendar.isEnabled()
                    ? await this.toGoogleEvent(event, tx)
                    : null;
            await this.repository.delete(id, actor.companyId, tx);
            if (googleEventId && restore) {
                await this.calendar.deleteEvent(googleEventId);
                setUndo(() => this.calendar.insertEvent(googleEventId, restore));
            }
        });
    }

    async addParticipants(id: string, participantIds: string[], actor: EventActor) {
        return await this.mutate(async (tx, setUndo) => {
            const event = await this.ownedEvent(id, actor, tx);
            const ids = [...new Set([...this.participantIds(event), ...participantIds])];
            return await this.save(event, this.updatedFields(event, {}), ids, tx, setUndo);
        });
    }

    async removeParticipant(id: string, employeeId: string, actor: EventActor) {
        return await this.mutate(async (tx, setUndo) => {
            const event = await this.ownedEvent(id, actor, tx);
            const before = this.participantIds(event);
            if (!before.includes(employeeId))
                throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.NOT_PARTICIPANT);
            const ids = before.filter((value) => value !== employeeId);
            return await this.save(event, this.updatedFields(event, {}), ids, tx, setUndo);
        });
    }

    /*
     * The database stays authoritative; Google is written last inside the transaction so a
     * Google failure rolls the database back. If the database still fails afterwards (commit
     * or exhausted retries), the recorded undo restores Google on a best-effort basis.
     */
    private async mutate<T>(
        operation: (tx: Prisma.TransactionClient, setUndo: SetUndo) => Promise<T>,
    ): Promise<T> {
        let undo: (() => Promise<void>) | undefined;
        // Every retry starts from the same committed state, so the first undo stays valid.
        const setUndo: SetUndo = (value) => {
            undo ??= value;
        };
        try {
            return await this.repository.transaction((tx) => operation(tx, setUndo));
        } catch (error: unknown) {
            if (undo) await undo().catch(() => undefined);
            throw error;
        }
    }

    private async save(
        event: StoredEvent,
        data: EventWrite,
        ids: string[],
        tx: Prisma.TransactionClient,
        setUndo: SetUndo,
    ) {
        await this.checkSchedule(data, ids, event.companyId, tx, event.id);
        // Events created before the sync (or while it was disabled) get mirrored on first edit.
        const googleEventId =
            event.googleEventId ?? (this.calendar.isEnabled() ? toGoogleEventId(event.id) : null);
        const updated = await this.repository.update(
            event.id,
            event.companyId,
            { ...data, googleEventId },
            ids,
            tx,
        );
        if (googleEventId && this.calendar.isEnabled()) {
            const previous = event.googleEventId ? await this.toGoogleEvent(event, tx) : null;
            await this.calendar.updateEvent(googleEventId, await this.toGoogleEvent(updated, tx));
            setUndo(() =>
                previous
                    ? this.calendar.updateEvent(googleEventId, previous)
                    : this.calendar.deleteEvent(googleEventId),
            );
        }
        return updated;
    }

    /*
     * Participants with an active account are invited by their login email, so the event shows
     * up in their own Google Calendar. Tenant, owner, type and all participant IDs (including
     * employees without an account) live in private properties visible only to the CRM account.
     */
    private async toGoogleEvent(
        event: StoredEvent,
        tx: Prisma.TransactionClient,
    ): Promise<GoogleCalendarEventBody> {
        const ids = this.participantIds(event);
        const emails = await this.repository.getAttendeeEmails(ids, event.companyId, tx);
        // Google silently drops private properties whose key exceeds 44 characters.
        const participants = Object.fromEntries(
            ids.map((employeeId) => [`employee_${employeeId.replace(/-/g, "")}`, "1"]),
        );
        return {
            summary: event.title,
            description: event.description,
            start: { dateTime: event.startsAt.toISOString(), timeZone: event.timeZone },
            end: { dateTime: event.endsAt.toISOString(), timeZone: event.timeZone },
            attendees: emails.map((email) => ({ email })),
            extendedProperties: {
                private: {
                    crmEventId: event.id,
                    companyId: event.companyId,
                    ownerAccountId: event.ownerAccountId,
                    type: event.type,
                    ...participants,
                },
            },
        };
    }

    private async ownedEvent(id: string, actor: EventActor, tx: Prisma.TransactionClient) {
        const event = await this.getById(id, actor.companyId, tx);
        if (event.ownerAccountId !== actor.accountId)
            throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.NOT_FOUND);
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
        companyId: string,
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
        const employees = await this.repository.getEmployees(ids, companyId, tx);
        if (employees.length !== ids.length) {
            throw new ApiError(HttpStatus.NOT_FOUND, EVENT_MESSAGES.EMPLOYEE_NOT_FOUND);
        }
        if (
            await this.repository.hasConflict(
                ids,
                data.startsAt,
                data.endsAt,
                companyId,
                tx,
                excludeId,
            )
        ) {
            throw new ApiError(HttpStatus.CONFLICT, EVENT_MESSAGES.CONFLICT);
        }
    }
}

export const eventService = new EventService();
