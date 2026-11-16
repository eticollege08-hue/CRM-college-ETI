import { Temporal } from "@js-temporal/polyfill";
import { EventType } from "@prisma/client";

import { employeeService } from "#modules/employees/employee.service.js";
import { eventService } from "#modules/events/event.service.js";
import { monthBounds } from "#utils/event-time.util.js";

import type { CalendarQuery } from "#modules/events/event.types.js";

export const calendarPageService = {
    async getPageData(query: CalendarQuery, companyId: string) {
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
            employeeService.getAll(companyId),
        ]);
        return {
            currentDate: today.toString(),
            month,
            timeZone: query.timeZone,
            range: { from: from.toISOString(), to: to.toISOString() },
            events,
            eventTypes: Object.values(EventType),
            employees: employees.map(({ id, fullName, imageId, position }) => ({
                id,
                fullName,
                imageId,
                position,
            })),
        };
    },
};
