import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ZodError } from "zod";

import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import type { NextFunction, Request, Response } from "express";

const JSON_ERROR_STATUSES = new Map([
    ["entity.parse.failed", HttpStatus.BAD_REQUEST],
    ["entity.too.large", HttpStatus.PAYLOAD_TOO_LARGE],
    ["charset.unsupported", HttpStatus.UNSUPPORTED_MEDIA_TYPE],
    ["encoding.unsupported", HttpStatus.UNSUPPORTED_MEDIA_TYPE],
    ["request.size.invalid", HttpStatus.BAD_REQUEST],
    ["request.aborted", HttpStatus.BAD_REQUEST],
]);

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
    let error = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, API_MESSAGES.INTERNAL_SERVER_ERROR);

    if (err instanceof ApiError && err.status < HttpStatus.INTERNAL_SERVER_ERROR) {
        error = err;
    } else if (
        err instanceof Error &&
        "status" in err &&
        typeof err.status === "number" &&
        (("type" in err &&
            typeof err.type === "string" &&
            JSON_ERROR_STATUSES.get(err.type) === err.status) ||
            (err.status === HttpStatus.BAD_REQUEST &&
                "code" in err &&
                typeof err.code === "string" &&
                err.code.startsWith("Z_")))
    ) {
        error = new ApiError(err.status, API_MESSAGES.BAD_REQUEST);
    } else if (err instanceof ZodError) {
        error = new ApiError(
            HttpStatus.UNPROCESSABLE_ENTITY,
            API_MESSAGES.VALIDATION_ERROR,
            err.issues.flatMap((issue) =>
                issue.code === "unrecognized_keys"
                    ? issue.keys.map((field) => ({
                          field: field || "body",
                          message: "This field is not allowed.",
                      }))
                    : [
                          {
                              field: issue.path.map(String).join(".") || "body",
                              message: issue.message,
                          },
                      ],
            ),
        );
    } else if (err instanceof PrismaClientKnownRequestError) {
        const mapping: Record<string, [number, string]> = {
            P2002: [HttpStatus.CONFLICT, API_MESSAGES.CONFLICT],
            P2003: [HttpStatus.UNPROCESSABLE_ENTITY, API_MESSAGES.RELATED_RECORD_NOT_FOUND],
            P2025: [HttpStatus.NOT_FOUND, API_MESSAGES.NOT_FOUND],
            P2000: [HttpStatus.UNPROCESSABLE_ENTITY, API_MESSAGES.BAD_REQUEST],
            P2005: [HttpStatus.UNPROCESSABLE_ENTITY, API_MESSAGES.BAD_REQUEST],
            P2006: [HttpStatus.UNPROCESSABLE_ENTITY, API_MESSAGES.BAD_REQUEST],
        };
        const entry = mapping[err.code];
        if (entry) error = new ApiError(entry[0], entry[1]);
    }

    /*if (error.status === HttpStatus.INTERNAL_SERVER_ERROR) {
        // Upstream messages and stacks may contain credentials or database parameters.
        console.error("Request failed.");
    }*/

    if (res.headersSent) {
        return next(new ApiError(error.status, error.message, error.details));
    }

    const isApiRequest =
        req.path.startsWith("/api") || req.headers.accept?.includes("application/json") || req.xhr;
    if (isApiRequest) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(error.status).json({
            success: false,
            message: error.message,
            details: error.details,
        });
    }

    return res.status(error.status).type("text/plain").send(error.message);
}
