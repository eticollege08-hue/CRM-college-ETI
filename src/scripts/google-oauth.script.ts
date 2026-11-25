import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

import { z } from "zod";

import { getGoogleOAuthClient } from "#config/google-calendar.config.js";
import { GOOGLE_CALENDAR_SCOPE, GOOGLE_TOKEN_URL } from "#services/google-calendar.service.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenSchema = z.object({ refresh_token: z.string().min(1) });

export function buildAuthorizationUrl(clientId: string, redirectUri: string, state: string) {
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GOOGLE_CALENDAR_SCOPE,
        // offline + consent make Google return a refresh token even on repeated authorization.
        access_type: "offline",
        prompt: "consent",
        state,
    }).toString();
    return url.toString();
}

/*
 * One-time helper for the CRM Google account: opens a loopback redirect (allowed for "Desktop
 * app" OAuth clients), exchanges the code and prints the refresh token for .env.
 */
export async function obtainRefreshToken(): Promise<string> {
    const { clientId, clientSecret } = getGoogleOAuthClient();
    const state = randomBytes(16).toString("hex");
    let redirectUri = "";

    const exchange = async (code: string) => {
        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }).toString(),
        });
        const parsed = tokenSchema.safeParse(await response.json().catch(() => null));
        if (!response.ok || !parsed.success) throw new Error("Token exchange failed.");
        return parsed.data.refresh_token;
    };

    return await new Promise<string>((resolve, reject) => {
        const server = createServer((req, res) => {
            const url = new URL(req.url ?? "/", "http://127.0.0.1");
            if (url.pathname !== "/callback") {
                res.writeHead(404).end();
                return;
            }
            const code = url.searchParams.get("code");
            if (url.searchParams.get("state") !== state || !code) {
                res.writeHead(400).end("Authorization failed. Return to the terminal.");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Authorization completed. You can close this tab.");
            server.close();
            exchange(code).then(resolve, reject);
        });

        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                reject(new Error("Could not start the local callback server."));
                return;
            }
            redirectUri = `http://127.0.0.1:${address.port}/callback`;
            console.log("Open this URL and sign in with the CRM Google account:\n");
            console.log(buildAuthorizationUrl(clientId, redirectUri, state));
        });
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    obtainRefreshToken()
        .then((refreshToken) => {
            console.log("\nAdd this line to .env (keep it secret):\n");
            console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${refreshToken}`);
        })
        .catch(() => {
            console.error(
                "Google authorization failed. Check GOOGLE_OAUTH_CLIENT_ID/SECRET and try again.",
            );
            process.exitCode = 1;
        });
}
