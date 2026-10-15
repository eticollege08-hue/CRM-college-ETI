import { z } from "zod";

import { authLoginSchema } from "#schemas/auth.schema.js";

const seedConfigSchema = authLoginSchema.extend({
    name: z.string().trim().min(1).max(100),
    password: authLoginSchema.shape.password.refine(
        (password) => Array.from(password).length >= 12,
        "Initial admin password must contain at least 12 characters.",
    ),
});

export function getSeedConfig() {
    const result = seedConfigSchema.safeParse({
        name: process.env.ADMIN_NAME ?? "System Administrator",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    });
    if (!result.success) {
        throw new Error(
            "Configure ADMIN_EMAIL, ADMIN_PASSWORD (12 characters minimum, 72 UTF-8 bytes maximum) and ADMIN_NAME.",
        );
    }
    return result.data;
}
