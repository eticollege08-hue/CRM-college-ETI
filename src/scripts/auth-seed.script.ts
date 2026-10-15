import "dotenv/config";
import { pathToFileURL } from "node:url";

import prisma from "#config/prisma.config.js";
import { MOCK_SEED_ACCOUNTS } from "#config/seed.config.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { hashPassword } from "#utils/password.util.js";

export async function seedMockAccounts() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Mock account seed is allowed only in development.");
    }

    for (const config of MOCK_SEED_ACCOUNTS) {
        const existing = await userAccountService.getByEmail(config.email);
        if (existing) continue;

        const passwordHash = await hashPassword(config.password);
        await userAccountService.createSeedAccount(
            { email: config.email, passwordHash, roleKey: config.roleKey },
            config.name,
        );
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    seedMockAccounts()
        .then(() => {
            console.log("Mock account setup completed.");
        })
        .catch(() => {
            console.error(
                "Mock account setup failed. Check development environment and database availability.",
            );
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
