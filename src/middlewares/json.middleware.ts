import express from "express";

import { HttpStatus } from "#constants/http-status.constants.js";

import type { IncomingMessage } from "node:http";
import type { RequestHandler } from "express";

const jsonBodyLengths = new WeakMap<IncomingMessage, number>();

const parseJsonBody = express.json({
    limit: "100kb",
    verify(req, _res, buffer) {
        // The parser turns zero bytes into {}; retain only the length, never raw credentials.
        jsonBodyLengths.set(req, buffer.length);
    },
});

export const jsonBodyParser: RequestHandler = (req, res, next) => {
    parseJsonBody(req, res, (error: unknown) => {
        if (
            error instanceof Error &&
            "status" in error &&
            error.status === HttpStatus.BAD_REQUEST &&
            !("type" in error)
        ) {
            // Decompression errors have no body-parser type; tag them only at the parser boundary.
            Object.assign(error, { type: "entity.decode.failed" });
        }
        next(error);
    });
};

export function getJsonBodyLength(req: IncomingMessage): number | undefined {
    return jsonBodyLengths.get(req);
}
