import type { z } from "zod";

import type { userAccountCreateSchema } from "./user-account.schema.js";

export type UserAccountCreateInput = z.infer<typeof userAccountCreateSchema>;
