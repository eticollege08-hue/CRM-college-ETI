import { HttpStatus } from "#constants/http-status.constants.js";

import { AUTH_SUCCESS_MESSAGES } from "./auth.constants.js";
import { clearAuthCookie, setAuthCookie } from "./auth-cookie.util.js";

import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { AuthService } from "./auth.service.js";
import type { AuthLoginInput } from "./auth.types.js";

export class AuthController {
    constructor(private readonly service: AuthService) {
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
    }

    async login(req: Request<ParamsDictionary, unknown, AuthLoginInput>, res: Response) {
        const ip = req.ip ?? req.socket.remoteAddress;

        if (!ip) {
            throw new Error("Client IP is unavailable.");
        }

        const result = await this.service.login(req.body, ip);
        setAuthCookie(res, result.token);
        res.status(HttpStatus.OK).json({ expiresIn: result.expiresIn });
    }

    async logout(_req: Request, res: Response) {
        clearAuthCookie(res);
        res.status(HttpStatus.OK).json({
            success: true,
            message: AUTH_SUCCESS_MESSAGES.LOGOUT,
        });
    }
}
