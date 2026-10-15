import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { clearAuthCookie, setAuthCookie } from "#utils/auth-cookie.util.js";
import { ApiError } from "#utils/error.util.js";

import { AUTH_MESSAGES } from "./auth.constants.js";
import { authService } from "./auth.service.js";

import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { AuthService } from "./auth.service.js";
import type { AuthLoginInput } from "./auth.types.js";

export class AuthController {
    constructor(private readonly service: AuthService = authService) {
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
    }
    async login(req: Request<ParamsDictionary, unknown, AuthLoginInput>, res: Response) {
        const ip = req.ip ?? req.socket.remoteAddress;
        if (!ip)
            throw new ApiError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                API_MESSAGES.INTERNAL_SERVER_ERROR,
            );
        const token = await this.service.login(req.body, ip);
        setAuthCookie(res, token);
        res.status(HttpStatus.OK).json({ success: true, message: AUTH_MESSAGES.LOGIN });
    }
    async logout(_req: Request, res: Response) {
        clearAuthCookie(res);
        res.status(HttpStatus.OK).json({ success: true, message: AUTH_MESSAGES.LOGOUT });
    }
}
export const authController = new AuthController();
