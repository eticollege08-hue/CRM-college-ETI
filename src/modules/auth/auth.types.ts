import type { z } from "zod";
import type { authLoginSchema } from "#schemas/auth.schema.js";

export type AuthLoginInput = z.infer<typeof authLoginSchema>;
