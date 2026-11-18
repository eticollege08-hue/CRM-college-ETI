import { afterEach, describe, expect, it, vi } from "vitest";

import { getGoogleCalendarConfig } from "../../src/config/google-calendar.config.js";

function enable(overrides: Record<string, string | undefined> = {}) {
    const values: Record<string, string | undefined> = {
        GOOGLE_CALENDAR_ENABLED: "true",
        GOOGLE_CALENDAR_ID: undefined,
        GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
        GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
        GOOGLE_CALENDAR_TIMEOUT_MS: undefined,
        ...overrides,
    };
    for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

describe("getGoogleCalendarConfig", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("is disabled by default", () => {
        vi.stubEnv("GOOGLE_CALENDAR_ENABLED", undefined);
        expect(getGoogleCalendarConfig()).toEqual({ enabled: false });
    });

    it("reads the OAuth client and defaults to the primary calendar", () => {
        enable();
        expect(getGoogleCalendarConfig()).toEqual({
            enabled: true,
            calendarId: "primary",
            clientId: "client-id.apps.googleusercontent.com",
            clientSecret: "client-secret",
            refreshToken: "refresh-token",
            timeoutMs: 5000,
        });
    });

    it("uses an explicit calendar ID", () => {
        enable({ GOOGLE_CALENDAR_ID: "team@group.calendar.google.com" });
        expect(getGoogleCalendarConfig()).toMatchObject({
            calendarId: "team@group.calendar.google.com",
        });
    });

    it.each(["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"])(
        "requires %s when enabled",
        (name) => {
            enable({ [name]: " " });
            expect(() => getGoogleCalendarConfig()).toThrow(name);
        },
    );

    it.each(["yes", "TRUE"])("rejects a non-boolean flag: %s", (value) => {
        vi.stubEnv("GOOGLE_CALENDAR_ENABLED", value);
        expect(() => getGoogleCalendarConfig()).toThrow("true or false");
    });

    it.each(["999", "7001", "5s"])("rejects an out-of-range timeout: %s", (value) => {
        enable({ GOOGLE_CALENDAR_TIMEOUT_MS: value });
        expect(() => getGoogleCalendarConfig()).toThrow("GOOGLE_CALENDAR_TIMEOUT_MS");
    });
});
