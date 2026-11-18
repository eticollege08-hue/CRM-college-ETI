import { z } from "zod";

import { getGoogleCalendarConfig } from "#config/google-calendar.config.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { GoogleCalendarConfig } from "#config/google-calendar.config.js";

export const GOOGLE_CALENDAR_MESSAGES = {
    UNAVAILABLE: "Google Calendar is unavailable. Please try again later.",
};

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
// Refresh early so a token never expires between the check and the Calendar request.
const TOKEN_REFRESH_MARGIN_MS = 60_000;

const tokenResponseSchema = z.object({
    access_token: z.string().min(1),
    expires_in: z.number().int().positive(),
});
const existingEventSchema = z.object({
    attendees: z
        .array(z.object({ email: z.string(), responseStatus: z.string().optional() }))
        .optional(),
});

export interface GoogleCalendarAttendee {
    email: string;
    responseStatus?: string;
}

export interface GoogleCalendarEventBody {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees: GoogleCalendarAttendee[];
    extendedProperties: { private: Record<string, string> };
}

type EnabledConfig = Extract<GoogleCalendarConfig, { enabled: true }>;
type FetchFunction = typeof fetch;

interface CachedToken {
    value: string;
    expiresAt: number;
}

export class GoogleCalendarService {
    private config: GoogleCalendarConfig | undefined;
    private token: Promise<CachedToken> | undefined;

    constructor(
        // Read lazily: dotenv runs before app startup, and importing must not throw in tests.
        private readonly loadConfig: () => GoogleCalendarConfig = getGoogleCalendarConfig,
        private readonly fetchImpl: FetchFunction = fetch,
        private readonly now: () => number = Date.now,
    ) {}

    isEnabled(): boolean {
        return this.getConfig().enabled;
    }

    // Insert with a CRM-chosen ID; 409 means an earlier attempt already created it.
    async insertEvent(eventId: string, body: GoogleCalendarEventBody): Promise<void> {
        const config = this.enabledConfig();
        const response = await this.request(config, "POST", "", {
            id: eventId,
            ...this.full(body),
        });
        if (response.status === HttpStatus.CONFLICT) {
            await this.updateEvent(eventId, body);
            return;
        }
        this.ensureOk(response);
    }

    /*
     * Replace the whole Google event, keeping attendees' RSVP answers that a full replace would
     * otherwise reset. An event removed directly in Google is recreated.
     */
    async updateEvent(eventId: string, body: GoogleCalendarEventBody): Promise<void> {
        const config = this.enabledConfig();
        const path = `/${encodeURIComponent(eventId)}`;
        const current = await this.request(config, "GET", path);
        if (current.status === HttpStatus.NOT_FOUND || current.status === 410) {
            this.ensureOk(
                await this.request(config, "POST", "", { id: eventId, ...this.full(body) }),
            );
            return;
        }
        this.ensureOk(current);

        const parsed = existingEventSchema.safeParse(await current.json().catch(() => null));
        const answers = new Map(
            (parsed.success ? (parsed.data.attendees ?? []) : []).map((attendee) => [
                attendee.email.toLowerCase(),
                attendee.responseStatus,
            ]),
        );
        const attendees = body.attendees.map((attendee) => {
            const responseStatus = answers.get(attendee.email.toLowerCase());
            return responseStatus ? { ...attendee, responseStatus } : attendee;
        });
        this.ensureOk(await this.request(config, "PUT", path, this.full({ ...body, attendees })));
    }

    // Deleting an event that is already gone in Google is treated as success.
    async deleteEvent(eventId: string): Promise<void> {
        const config = this.enabledConfig();
        const response = await this.request(config, "DELETE", `/${encodeURIComponent(eventId)}`);
        if (response.status === HttpStatus.NOT_FOUND || response.status === 410) return;
        this.ensureOk(response);
    }

    // "confirmed" restores an event that was cancelled (deleted) in Google before.
    private full(body: GoogleCalendarEventBody) {
        return { ...body, status: "confirmed" };
    }

    private getConfig(): GoogleCalendarConfig {
        this.config ??= this.loadConfig();
        return this.config;
    }

    private enabledConfig(): EnabledConfig {
        const config = this.getConfig();
        if (!config.enabled) throw new Error("Google Calendar sync is disabled.");
        return config;
    }

    private ensureOk(response: Response) {
        if (!response.ok) this.unavailable();
    }

    private unavailable(): never {
        // Upstream bodies may echo calendar data or credentials details; never forward them.
        throw new ApiError(HttpStatus.BAD_GATEWAY, GOOGLE_CALENDAR_MESSAGES.UNAVAILABLE);
    }

    private async request(
        config: EnabledConfig,
        method: "GET" | "POST" | "PUT" | "DELETE",
        path: string,
        body?: object,
    ): Promise<Response> {
        const token = await this.accessToken(config);
        const url = new URL(
            `${CALENDAR_API_URL}/calendars/${encodeURIComponent(config.calendarId)}/events${path}`,
        );
        // Google emails invitations, updates and cancellations to the attendees.
        if (method !== "GET") url.searchParams.set("sendUpdates", "all");
        const response = await this.send(config, url, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(body ? { "Content-Type": "application/json" } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (response.status === HttpStatus.UNAUTHORIZED) this.token = undefined;
        return response;
    }

    private async send(config: EnabledConfig, url: URL, init: RequestInit): Promise<Response> {
        try {
            return await this.fetchImpl(url, {
                ...init,
                signal: AbortSignal.timeout(config.timeoutMs),
            });
        } catch {
            this.unavailable();
        }
    }

    private async accessToken(config: EnabledConfig): Promise<string> {
        const cached = await this.token?.catch(() => undefined);
        if (cached && cached.expiresAt - TOKEN_REFRESH_MARGIN_MS > this.now()) return cached.value;

        // Share one in-flight token request between concurrent event writes.
        this.token = this.fetchToken(config);
        try {
            return (await this.token).value;
        } catch (error: unknown) {
            this.token = undefined;
            throw error;
        }
    }

    private async fetchToken(config: EnabledConfig): Promise<CachedToken> {
        const response = await this.send(config, new URL(GOOGLE_TOKEN_URL), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: config.refreshToken,
            }).toString(),
        });
        // invalid_grant (revoked or expired refresh token) also lands here.
        if (!response.ok) this.unavailable();

        const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => null));
        if (!parsed.success) this.unavailable();
        return {
            value: parsed.data.access_token,
            expiresAt: this.now() + parsed.data.expires_in * 1000,
        };
    }
}

export const googleCalendarService = new GoogleCalendarService();
