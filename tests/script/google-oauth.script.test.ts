import { describe, expect, it } from "vitest";

import { buildAuthorizationUrl } from "../../src/scripts/google-oauth.script.js";

describe("buildAuthorizationUrl", () => {
    it("requests offline Calendar events access for the loopback redirect", () => {
        const url = new URL(
            buildAuthorizationUrl("client-id", "http://127.0.0.1:5555/callback", "state-value"),
        );

        expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
        expect(Object.fromEntries(url.searchParams)).toEqual({
            client_id: "client-id",
            redirect_uri: "http://127.0.0.1:5555/callback",
            response_type: "code",
            scope: "https://www.googleapis.com/auth/calendar.events",
            access_type: "offline",
            prompt: "consent",
            state: "state-value",
        });
    });
});
