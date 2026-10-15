import "dotenv/config";
import { pathToFileURL } from "node:url";

import prisma from "#config/prisma.config.js";
import { getSeedConfig } from "#config/seed.config.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { hashPassword } from "#utils/password.util.js";

export async function seedInitialAdmin() {
    const config = getSeedConfig();
    const existing = await userAccountService.getByEmail(config.email);
    if (existing) return { accountId: existing.id };

    const passwordHash = await hashPassword(config.password);
    const account = await userAccountService.createInitialOwner(
        { email: config.email, passwordHash },
        config.name,
    );
    return { accountId: account.id };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    seedInitialAdmin()
        .then(() => {
            console.log("Initial admin setup completed.");
        })
        .catch(() => {
            console.error(
                "Initial admin setup failed. Check configuration and database availability.",
            );
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
