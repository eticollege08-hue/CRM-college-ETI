import { Temporal } from "@js-temporal/polyfill";

export function isTimeZone(value: string): boolean {
    if (/^[+-]/.test(value)) return false;
    try {
        Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(value);
        return true;
    } catch {
        return false;
    }
}

export function dayBounds(date: string, timeZone: string) {
    const day = Temporal.PlainDate.from(date);
    return {
        from: new Date(day.toZonedDateTime(timeZone).epochMilliseconds),
        to: new Date(day.add({ days: 1 }).toZonedDateTime(timeZone).epochMilliseconds),
    };
}

export function monthBounds(month: string, timeZone: string) {
    const first = Temporal.PlainYearMonth.from(month).toPlainDate({ day: 1 });
    return {
        from: new Date(first.toZonedDateTime(timeZone).epochMilliseconds),
        to: new Date(first.add({ months: 1 }).toZonedDateTime(timeZone).epochMilliseconds),
    };
}

export function localDate(instant: Date, timeZone: string): string {
    return Temporal.Instant.fromEpochMilliseconds(instant.getTime())
        .toZonedDateTimeISO(timeZone)
        .toPlainDate()
        .toString();
}

export function validEventRange(startsAt: Date, endsAt: Date, timeZone: string): boolean {
    if (startsAt >= endsAt) return false;
    const date = localDate(startsAt, timeZone);
    const bounds = dayBounds(date, timeZone);
    // The exclusive end may be exactly midnight, but a full local day is out of scope.
    return (
        endsAt <= bounds.to &&
        !(startsAt.getTime() === bounds.from.getTime() && endsAt.getTime() === bounds.to.getTime())
    );
}
