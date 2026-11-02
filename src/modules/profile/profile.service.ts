import { userAccountService } from "#modules/user-accounts/user-account.service.js";

import type { UserAccountService } from "#modules/user-accounts/user-account.service.js";
import type { ProfileUpdateInput } from "./profile.types.js";

export class ProfileService {
    constructor(private readonly accounts: UserAccountService = userAccountService) {}

    async getOwnProfile(accountId: string) {
        return await this.accounts.getProfileById(accountId);
    }

    async updateOwnProfile(accountId: string, data: ProfileUpdateInput) {
        return await this.accounts.updateProfile(accountId, data);
    }
}

export const profileService = new ProfileService();
