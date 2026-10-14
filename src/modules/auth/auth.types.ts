import type { z } from "zod";

import type { authLoginSchema } from "./auth.schema.js";

export type AuthLoginInput = z.infer<typeof authLoginSchema>;

export interface AuthAccount {
    id: string;
    passwordHash: string;
    isActive: boolean;
    role: string;
}

// Implement these operations using the internal UserAccount service after CRM-110.
export interface AuthUserAccounts {
    findForAuthentication(email: string): Promise<AuthAccount | null>;
    updateLastLoginAt(accountId: string, date: Date): Promise<void>;
}

export interface AuthTokenPayload {
    userId: string;
    role: string;
}

// The default implementation uses CRM-102.2 JWT signing; keep injectable for tests.
export interface AuthTokenIssuer {
    issue(payload: AuthTokenPayload, expiresIn: number): Promise<string>;
}

export interface AuthPasswords {
    hash(password: string): Promise<string>;
    verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface AuthLoginResult {
    token: string;
    expiresIn: number;
}
