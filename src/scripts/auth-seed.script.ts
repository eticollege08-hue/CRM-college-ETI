import { Buffer } from "node:buffer";
import { z } from "zod";

import { hashPassword } from "#utils/password.util.js";

const initialAdminSchema = z.strictObject({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    password: z
        .string()
        .refine((password) => Array.from(password).length >= 12)
        .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

export type InitialAdminConfig = z.infer<typeof initialAdminSchema>;

export interface InitialAdminSeedResult {
    accountId: string;
    created: boolean;
}

export interface InitialAdminStore {
    findByEmail(email: string): Promise<{ id: string } | null>;
    // The CRM-110 adapter must atomically create Employee + UserAccount, and on a
    // concurrent duplicate return the existing account without updating its password.
    createIfAbsent(input: {
        name: string;
        email: string;
        passwordHash: string;
        role: "OWNER";
    }): Promise<InitialAdminSeedResult>;
}

export function getInitialAdminConfig(): InitialAdminConfig {
    const result = initialAdminSchema.safeParse({
        name: process.env.ADMIN_NAME ?? "System Administrator",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    });

    if (!result.success) {
        throw new Error(
            "Configure ADMIN_EMAIL, ADMIN_PASSWORD (12 characters minimum, 72 UTF-8 bytes maximum) and a valid ADMIN_NAME.",
        );
    }

    return result.data;
}

export async function seedInitialAdmin(
    store: InitialAdminStore,
    config: InitialAdminConfig = getInitialAdminConfig(),
    hash: (password: string) => Promise<string> = hashPassword,
): Promise<InitialAdminSeedResult> {
    const result = initialAdminSchema.safeParse(config);

    if (!result.success) {
        throw new Error("Invalid initial admin configuration.");
    }

    const existing = await store.findByEmail(result.data.email);

    if (existing) {
        return { accountId: existing.id, created: false };
    }

    const passwordHash = await hash(result.data.password);
    return store.createIfAbsent({
        name: result.data.name,
        email: result.data.email,
        passwordHash,
        role: "OWNER",
    });
}
