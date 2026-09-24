export class ApiError extends Error {
    status: number
    name: string

    constructor(status: number, message: string) {
        super(message)
        this.status = status
        this.name = 'ApiError'
    }
}