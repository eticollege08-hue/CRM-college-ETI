import { describe, expect, it, vi } from "vitest";

import { GoogleCalendarService } from "../../src/services/google-calendar.service.js";

import type { GoogleCalendarConfig } from "../../src/config/google-calendar.config.js";
import type { GoogleCalendarEventBody } from "../../src/services/google-calendar.service.js";

const config: GoogleCalendarConfig = {
    enabled: true,
    calendarId: "primary",
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
    timeoutMs: 5000,
};
const body: GoogleCalendarEventBody = {
    summary: "Planning",
    description: "Details",
    start: { dateTime: "2026-10-26T10:00:00.000Z", timeZone: "UTC" },
    end: { dateTime: "2026-10-26T11:00:00.000Z", timeZone: "UTC" },
    attendees: [{ email: "olena@example.com" }, { email: "new@example.com" }],
    extendedProperties: { private: { companyId: "company" } },
};
const eventsUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const tokenResponse = () =>
    new Response(JSON.stringify({ access_token: "access-token", expires_in: 3600 }));
const status = (code: number, json: unknown = {}) =>
    new Response(code === 204 ? null : JSON.stringify(json), { status: code });

function setup(...responses: Response[]) {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValueOnce(tokenResponse());
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
    let now = 1_000_000;
    const service = new GoogleCalendarService(
        () => config,
        fetchMock,
        () => now,
    );
    return { service, fetchMock, advance: (ms: number) => (now += ms) };
}

function call(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, index: number) {
    const [url, init] = fetchMock.mock.calls[index];
    return { url: String(url), init: init ?? {} };
}

describe("GoogleCalendarService", () => {
    it("exchanges the refresh token of the CRM account for an access token", async () => {
        const { service, fetchMock } = setup(status(200));
        await service.insertEvent("abc123", body);

        const token = call(fetchMock, 0);
        expect(token.url).toBe("https://oauth2.googleapis.com/token");
        expect(Object.fromEntries(new URLSearchParams(String(token.init.body)))).toEqual({
            grant_type: "refresh_token",
            client_id: "client-id",
            client_secret: "client-secret",
            refresh_token: "refresh-token",
        });
    });

    it("inserts an event with the CRM ID and emails the attendees", async () => {
        const { service, fetchMock } = setup(status(200));
        await service.insertEvent("abc123", body);

        const insert = call(fetchMock, 1);
        expect(insert.url).toBe(`${eventsUrl}?sendUpdates=all`);
        expect(insert.init.method).toBe("POST");
        expect(insert.init.headers).toMatchObject({ Authorization: "Bearer access-token" });
        expect(JSON.parse(String(insert.init.body))).toEqual({
            id: "abc123",
            ...body,
            status: "confirmed",
        });
    });

    it("replaces the event when a retried insert finds it already exists", async () => {
        const { service, fetchMock } = setup(status(409), status(200, {}), status(200));
        await service.insertEvent("abc123", body);
        expect(call(fetchMock, 2).init.method).toBe("GET");
        expect(call(fetchMock, 3).init.method).toBe("PUT");
        expect(call(fetchMock, 3).url).toBe(`${eventsUrl}/abc123?sendUpdates=all`);
    });

    it("keeps attendees' RSVP answers when replacing an event", async () => {
        const { service, fetchMock } = setup(
            status(200, {
                attendees: [
                    { email: "Olena@example.com", responseStatus: "accepted" },
                    { email: "removed@example.com", responseStatus: "declined" },
                ],
            }),
            status(200),
        );
        await service.updateEvent("abc123", body);

        expect(call(fetchMock, 1).url).toBe(`${eventsUrl}/abc123`);
        expect(JSON.parse(String(call(fetchMock, 2).init.body)).attendees).toEqual([
            { email: "olena@example.com", responseStatus: "accepted" },
            { email: "new@example.com" },
        ]);
    });

    it.each([404, 410])("recreates an event that returns %s in Google", async (code) => {
        const { service, fetchMock } = setup(status(code), status(200));
        await service.updateEvent("abc123", body);
        expect(call(fetchMock, 2).init.method).toBe("POST");
    });

    it.each([204, 404, 410])("treats delete status %s as success", async (code) => {
        const { service, fetchMock } = setup(status(code));
        await expect(service.deleteEvent("abc123")).resolves.toBeUndefined();
        expect(call(fetchMock, 1).init.method).toBe("DELETE");
        expect(call(fetchMock, 1).url).toBe(`${eventsUrl}/abc123?sendUpdates=all`);
    });

    it("reuses the cached token until it is close to expiry", async () => {
        const { service, fetchMock, advance } = setup(status(200), status(200));
        await service.insertEvent("one", body);
        advance(60_000);
        await service.insertEvent("two", body);
        expect(fetchMock).toHaveBeenCalledTimes(3);

        advance(3_600_000);
        fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(status(200));
        await service.insertEvent("three", body);
        expect(call(fetchMock, 3).url).toBe("https://oauth2.googleapis.com/token");
    });

    it("hides upstream errors behind a sanitized 502", async () => {
        const { service } = setup(new Response("secret details", { status: 500 }));
        await expect(service.insertEvent("abc123", body)).rejects.toMatchObject({
            status: 502,
            message: "Google Calendar is unavailable. Please try again later.",
        });
    });

    it("maps network failures and a revoked refresh token to 502", async () => {
        const network = new GoogleCalendarService(
            () => config,
            vi.fn<typeof fetch>().mockRejectedValue(new Error("ECONNRESET")),
        );
        await expect(network.deleteEvent("abc123")).rejects.toMatchObject({ status: 502 });

        const revoked = new GoogleCalendarService(
            () => config,
            vi.fn<typeof fetch>().mockResolvedValue(status(400, { error: "invalid_grant" })),
        );
        await expect(revoked.deleteEvent("abc123")).rejects.toMatchObject({ status: 502 });
    });

    it("reports a disabled sync without calling Google", () => {
        const fetchMock = vi.fn<typeof fetch>();
        const service = new GoogleCalendarService(() => ({ enabled: false }), fetchMock);
        expect(service.isEnabled()).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
