export type GoogleCalendarConfig =
    | { enabled: false }
    | {
          enabled: true;
          calendarId: string;
          clientId: string;
          clientSecret: string;
          refreshToken: string;
          timeoutMs: number;
      };

// Up to four sequential Google requests (token, insert, read, replace) must fit into
// EVENT_TRANSACTION_TIMEOUT_MS because they run inside the database transaction.
const DEFAULT_TIMEOUT_MS = "5000";
const MAX_TIMEOUT_MS = 7000;

function readRequired(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is required when GOOGLE_CALENDAR_ENABLED=true.`);
    return value;
}

export function getGoogleOAuthClient() {
    return {
        clientId: readRequired("GOOGLE_OAUTH_CLIENT_ID"),
        clientSecret: readRequired("GOOGLE_OAUTH_CLIENT_SECRET"),
    };
}

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
    const enabled = process.env.GOOGLE_CALENDAR_ENABLED ?? "false";
    if (enabled !== "true" && enabled !== "false") {
        throw new Error("GOOGLE_CALENDAR_ENABLED must be true or false.");
    }
    if (enabled === "false") return { enabled: false };

    const { clientId, clientSecret } = getGoogleOAuthClient();
    const refreshToken = readRequired("GOOGLE_OAUTH_REFRESH_TOKEN");
    // "primary" is the main calendar of the CRM Google account that authorized the token.
    const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";

    const timeoutValue = process.env.GOOGLE_CALENDAR_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
    const timeoutMs = Number(timeoutValue);
    if (!/^\d+$/.test(timeoutValue) || timeoutMs < 1000 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error(
            `GOOGLE_CALENDAR_TIMEOUT_MS must be an integer between 1000 and ${MAX_TIMEOUT_MS}.`,
        );
    }

    return { enabled: true, calendarId, clientId, clientSecret, refreshToken, timeoutMs };
}
