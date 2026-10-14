import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import type { OutgoingHttpHeaders } from "node:http";
import type { Express, Request, Response } from "express";

export interface AuthHttpResponse {
    status: number;
    headers: OutgoingHttpHeaders;
    body: unknown;
}

// Exercise Express in-process using HTTP stream doubles; no server or TCP connection.
export function dispatchAuthRequest(
    app: Express,
    path: string,
    body?: string,
    headers: Record<string, string> = {},
): Promise<AuthHttpResponse> {
    const socket = new Socket();
    Object.defineProperty(socket, "remoteAddress", { value: "192.0.2.1" });
    const req = new IncomingMessage(socket);
    req.method = "POST";
    req.url = path;
    req.headers = {
        origin: "https://crm.example.com",
        ...(body !== undefined
            ? {
                  "content-type": "application/json",
                  "content-length": String(Buffer.byteLength(body)),
              }
            : {}),
        ...headers,
    };
    const res = new ServerResponse(req);

    return new Promise((resolve, reject) => {
        res.end = (chunk?: unknown) => {
            try {
                const raw = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
                const responseBody: unknown =
                    typeof raw === "string" && raw.length > 0 ? JSON.parse(raw) : undefined;
                resolve({ status: res.statusCode, headers: res.getHeaders(), body: responseBody });
            } catch (error) {
                reject(error);
            } finally {
                res.emit("finish");
                socket.destroy();
            }
            return res;
        };

        req.on("error", reject);
        if (body !== undefined) req.push(Buffer.from(body));
        req.push(null);
        app(req as Request, res as Response);
    });
}
