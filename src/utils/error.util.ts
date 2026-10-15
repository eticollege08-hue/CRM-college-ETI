export interface ErrorDetail {
    field: string;
    message: string;
}

export class ApiError extends Error {
    readonly name = "ApiError";

    constructor(
        readonly status: number,
        message: string,
        readonly details: ErrorDetail[] = [],
    ) {
        super(message);
    }
}
