import bcrypt from "bcryptjs";

import { getBcryptCost } from "#config/auth.config.js";

export async function hashPassword(password: string): Promise<string> {
    if (password.length === 0 || bcrypt.truncates(password)) {
        throw new Error("Password must contain between 1 and 72 UTF-8 bytes.");
    }

    return bcrypt.hash(password, getBcryptCost());
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    if (password.length === 0 || bcrypt.truncates(password)) {
        return false;
    }

    return bcrypt.compare(password, passwordHash);
}
