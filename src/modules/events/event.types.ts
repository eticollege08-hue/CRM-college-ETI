import type { z } from "zod";
import type {
    eventCreateSchema,
    eventUpdateSchema,
    eventListSchema,
    eventDeleteSchema,
    eventParticipantsSchema,
    calendarQuerySchema,
} from "./event.schema.js";

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type EventListInput = z.infer<typeof eventListSchema>;
export type EventDeleteInput = z.infer<typeof eventDeleteSchema>;
export type EventParticipantsInput = z.infer<typeof eventParticipantsSchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type EventWrite = Omit<EventCreateInput, "startsAt" | "endsAt" | "participantIds"> & {
    startsAt: Date;
    endsAt: Date;
};
