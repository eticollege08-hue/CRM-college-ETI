import { Buffer } from "node:buffer";
import { z } from "zod";

export const authLoginSchema = z.strictObject({
    email: z
        .string({ error: "Enter a valid email address." })
        .trim()
        .toLowerCase()
        .min(1)
        .max(254)
        .pipe(z.email({ error: "Enter a valid email address." })),
    password: z
        .string({ error: "Password is required." })
        .min(1, "Password is required.")
        .refine(
            (password) => Buffer.byteLength(password, "utf8") <= 72,
            "Password must be at most 72 bytes in UTF-8.",
        ),
});
