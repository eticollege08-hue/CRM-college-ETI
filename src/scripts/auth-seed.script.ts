import "dotenv/config";
import { pathToFileURL } from "node:url";

import prisma from "#config/prisma.config.js";
import { MOCK_SEED_ACCOUNTS } from "#config/seed.config.js";
import { hierarchyService } from "#modules/hierarchy/hierarchy.service.js";
import { userAccountService } from "#modules/user-accounts/user-account.service.js";
import { hashPassword } from "#utils/password.util.js";

export async function seedMockAccounts() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Mock account seed is allowed only in development.");
    }

    const accountsByEmail = new Map<string, { employeeId: string; companyId: string }>();
    const companyIdsByName = new Map<string, string>();

    for (const config of MOCK_SEED_ACCOUNTS) {
        let account: { employeeId: string; companyId: string } | null =
            await userAccountService.getByEmail(config.email);
        if (!account) {
            const passwordHash = await hashPassword(config.password);
            account = await userAccountService.createSeedAccount(
                { email: config.email, passwordHash, roleKey: config.roleKey },
                config.name,
                config.companyName,
            );
        }

        const existingCompanyId = companyIdsByName.get(config.companyName);
        if (existingCompanyId && existingCompanyId !== account.companyId) {
            throw new Error("Seed accounts for a company must belong to the same tenant.");
        }
        companyIdsByName.set(config.companyName, account.companyId);
        accountsByEmail.set(config.email, {
            employeeId: account.employeeId,
            companyId: account.companyId,
        });
    }

    const relationshipsByCompany = new Map<
        string,
        Array<{ managerId: string; subordinateId: string }>
    >();
    for (const config of MOCK_SEED_ACCOUNTS) {
        if (!config.managerEmail) continue;

        const manager = accountsByEmail.get(config.managerEmail);
        const subordinate = accountsByEmail.get(config.email);
        if (!manager || !subordinate || manager.companyId !== subordinate.companyId) {
            throw new Error("Seed hierarchy references must stay within the same tenant.");
        }

        const relationships = relationshipsByCompany.get(subordinate.companyId) ?? [];
        relationships.push({
            managerId: manager.employeeId,
            subordinateId: subordinate.employeeId,
        });
        relationshipsByCompany.set(subordinate.companyId, relationships);
    }

    for (const [companyId, relationships] of relationshipsByCompany) {
        const existing = await hierarchyService.getAll(companyId);
        const existingPairs = new Set(
            existing.map(({ employeeId, subordinateId }) => `${employeeId}:${subordinateId}`),
        );
        const existingSubordinates = new Set(existing.map(({ subordinateId }) => subordinateId));

        for (const relationship of relationships) {
            const pair = `${relationship.managerId}:${relationship.subordinateId}`;
            if (existingPairs.has(pair) || existingSubordinates.has(relationship.subordinateId))
                continue;

            await hierarchyService.create(
                {
                    employeeId: relationship.managerId,
                    subordinateId: relationship.subordinateId,
                },
                companyId,
            );
            existingPairs.add(pair);
            existingSubordinates.add(relationship.subordinateId);
        }
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
