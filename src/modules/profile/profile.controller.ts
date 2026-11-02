import { API_MESSAGES } from "#constants/api-messages.constants.js";
import { HttpStatus } from "#constants/http-status.constants.js";
import { ApiError } from "#utils/error.util.js";

import { PROFILE_MESSAGES } from "./profile.constants.js";
import { profileService } from "./profile.service.js";

import type { Request, Response } from "express";
import type { ProfileService } from "./profile.service.js";

export class ProfileController {
    constructor(private readonly service: ProfileService = profileService) {
        this.updateOwnProfile = this.updateOwnProfile.bind(this);
    }

    async updateOwnProfile(req: Request, res: Response) {
        const accountId = req.user?.userId;
        if (!accountId) throw new ApiError(HttpStatus.UNAUTHORIZED, API_MESSAGES.UNAUTHORIZED);

        await this.service.updateOwnProfile(accountId, req.body);
        res.status(HttpStatus.OK).json({ success: true, message: PROFILE_MESSAGES.UPDATED });
    }
}

export const profileController = new ProfileController();
