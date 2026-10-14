import { ApiError } from "#utils/error.util.js";

import { AUTH_ERRORS } from "./auth.constants.js";

export interface AuthErrorDetail {
    field: string;
    message: string;
}

type AuthErrorOptions =
    | {
          kind: Exclude<keyof typeof AUTH_ERRORS, "VALIDATION_ERROR" | "TOO_MANY_ATTEMPTS">;
      }
    | {
          kind: "VALIDATION_ERROR";
          details: readonly AuthErrorDetail[];
      }
    | {
          kind: "TOO_MANY_ATTEMPTS";
          retryAfterSeconds: number;
      };

export class AuthError extends ApiError {
    readonly code: string;
    readonly details: AuthErrorDetail[];
    readonly retryAfterSeconds: number | undefined;

    constructor(options: AuthErrorOptions) {
        const definition = AUTH_ERRORS[options.kind];

        super(definition.status, definition.message);

        this.name = "AuthError";
        this.code = definition.code;
        this.details =
            options.kind === "VALIDATION_ERROR"
                ? options.details.map(({ field, message }) => ({ field, message }))
                : [];
        this.retryAfterSeconds =
            options.kind === "TOO_MANY_ATTEMPTS" ? options.retryAfterSeconds : undefined;

        if (
            this.retryAfterSeconds !== undefined &&
            (!Number.isSafeInteger(this.retryAfterSeconds) || this.retryAfterSeconds < 1)
        ) {
            throw new Error("retryAfterSeconds must be a positive safe integer.");
        }
    }
}
