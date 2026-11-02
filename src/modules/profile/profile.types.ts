import type { z } from "zod";

import type { profileUpdateSchema } from "./profile.schema.js";

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
