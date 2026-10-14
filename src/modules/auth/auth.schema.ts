import { Buffer } from "node:buffer";
import { z } from "zod";

const emailSchema = z
    .string({
        error: (issue) =>
            issue.input === undefined ? "Email is required." : "Email must be a string.",
    })
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .max(254, "Email must be at most 254 characters.")
    .pipe(z.email({ error: "Enter a valid email address." }));

const passwordSchema = z
    .string({
        error: (issue) =>
            issue.input === undefined ? "Password is required." : "Password must be a string.",
    })
    .min(1, "Password is required.")
    .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Password must be at most 72 bytes in UTF-8.",
    );

export const authLoginSchema = z.strictObject({
    email: emailSchema,
    password: passwordSchema,
});
