import { Temporal } from "@js-temporal/polyfill";
import { EventType } from "@prisma/client";

import { employeeService } from "#modules/employees/employee.service.js";
import { eventService } from "#modules/events/event.service.js";
import { localDate, monthBounds } from "#utils/event-time.util.js";

import type { CalendarQuery } from "#modules/events/event.types.js";
import type { JWT } from "#types/common.types.js";

export const calendarPageService = {
    async getPageData(query: CalendarQuery, actor: JWT | string) {
        const companyId = typeof actor === "string" ? actor : actor.companyId;
        const today = Temporal.Now.plainDateISO(query.timeZone);
        const month = query.month ?? today.toPlainYearMonth().toString();
        const { from, to } = monthBounds(month, query.timeZone);
        const [events, employees] = await Promise.all([
            eventService.getRange(
                {
                    from: from.toISOString(),
                    to: to.toISOString(),
                    timeZone: query.timeZone,
                },
                companyId,
            ),
            employeeService.getAll(actor),
        ]);
        const daysWithEvents = new Map<string, typeof events>();
        for (const event of events) {
            const date = localDate(event.startsAt, query.timeZone);
            const dayEvents = daysWithEvents.get(date);
            if (dayEvents) dayEvents.push(event);
            else daysWithEvents.set(date, [event]);
        }
        const calendarMonth = Temporal.PlainYearMonth.from(month);
        const firstDate = calendarMonth.toPlainDate({ day: 1 });
        const leadingDays = firstDate.dayOfWeek - 1;
        const days = Array.from({ length: calendarMonth.daysInMonth }, (_, index) => {
            const date = firstDate.add({ days: index });
            const dateKey = date.toString();
            return {
                date: dateKey,
                day: date.day,
                events: (daysWithEvents.get(dateKey) ?? []).map((event) => ({
                    id: event.id,
                    title: event.title,
                    type: event.type.replaceAll("_", " "),
                    startsAt: this.formatTime(event.startsAt, query.timeZone),
                    endsAt: this.formatTime(event.endsAt, query.timeZone),
                    participants: event.participants,
                })),
            };
        });
        const cells = [...Array.from({ length: leadingDays }, () => null), ...days];
        while (cells.length % 7 !== 0) cells.push(null);
        return {
            currentDate: today.toString(),
            month,
            monthLabel: new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
            }).format(new Date(Date.UTC(calendarMonth.year, calendarMonth.month - 1, 1))),
            previousMonth: calendarMonth.subtract({ months: 1 }).toString(),
            nextMonth: calendarMonth.add({ months: 1 }).toString(),
            timeZone: query.timeZone,
            range: { from: from.toISOString(), to: to.toISOString() },
            events,
            eventTypes: Object.values(EventType),
            weeks: Array.from({ length: cells.length / 7 }, (_, index) =>
                cells.slice(index * 7, index * 7 + 7),
            ),
            employees: employees.map(({ id, fullName, imageId, position }) => ({
                id,
                fullName,
                imageId,
                position,
            })),
        };
    },

    formatTime(date: Date, timeZone: string) {
        const time = Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(
            timeZone,
        );
        return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
    },
};
