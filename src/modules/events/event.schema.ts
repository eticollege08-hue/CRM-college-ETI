import { EventType } from "@prisma/client";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import { dayBounds, isTimeZone } from "#utils/event-time.util.js";

import { EVENT_MAX_RANGE_DAYS } from "./event.constants.js";

export const eventTimeZoneSchema = z
    .string()
    .min(1)
    .max(100)
    .refine(isTimeZone, "Enter a valid IANA time zone.");
const instantSchema = z.iso
    .datetime({ offset: true })
    .refine(
        (value) =>
            !value.startsWith("0000") &&
            !/\.\d{4}/.test(value) &&
            Number.isFinite(Date.parse(value)),
        "Use a valid ISO date-time with an offset and at most three fractional digits.",
    );
const participantIdsSchema = z
    .array(z.uuid())
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "Participants must be unique.");

export const eventCreateSchema = z.strictObject({
    type: z.enum(EventType),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000),
    startsAt: instantSchema,
    endsAt: instantSchema,
    timeZone: eventTimeZoneSchema,
    participantIds: participantIdsSchema.min(1),
});
export const eventUpdateSchema = eventCreateSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");
export const eventDeleteSchema = z.strictObject({ confirmationTitle: z.string().min(1).max(200) });
export const eventParticipantsSchema = z.strictObject({
    participantIds: participantIdsSchema.min(1),
});
export const eventParticipantParamsSchema = z.strictObject({ id: z.uuid(), employeeId: z.uuid() });

export const eventListSchema = z
    .strictObject({
        date: z.iso
            .date()
            .refine((value) => !value.startsWith("0000"), "Year must be greater than zero.")
            .optional(),
        from: instantSchema.optional(),
        to: instantSchema.optional(),
        timeZone: eventTimeZoneSchema.default("UTC"),
    })
    .superRefine((data, ctx) => {
        if (data.date !== undefined) {
            if (data.from !== undefined || data.to !== undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: ["date"],
                    message: "Use date or from/to, not both.",
                });
            } else {
                try {
                    const bounds = dayBounds(data.date, data.timeZone);
                    if (bounds.from >= bounds.to) throw new Error("Skipped date.");
                } catch {
                    ctx.addIssue({
                        code: "custom",
                        path: ["date"],
                        message: "Enter an existing date in the selected time zone.",
                    });
                }
            }
        } else if (!data.from || !data.to) {
            ctx.addIssue({
                code: "custom",
                path: ["from"],
                message: "Provide date or both from and to.",
            });
        } else {
            const duration = Date.parse(data.to) - Date.parse(data.from);
            if (duration <= 0 || duration > EVENT_MAX_RANGE_DAYS * 86_400_000) {
                ctx.addIssue({
                    code: "custom",
                    path: ["to"],
                    message: "Range must be positive and at most 366 days.",
                });
            }
        }
    });

export const calendarQuerySchema = z.strictObject({
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
        .refine((value) => {
            try {
                return Temporal.PlainYearMonth.from(value).year > 0;
            } catch {
                return false;
            }
        })
        .optional(),
    timeZone: eventTimeZoneSchema.default("UTC"),
});
