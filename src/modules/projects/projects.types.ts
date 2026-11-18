import type { z } from "zod";

import type {
    projectCreateSchema,
    projectDeleteSchema,
    projectUpdateSchema,
} from "./projects.schema.js";

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectDeleteInput = z.infer<typeof projectDeleteSchema>;
