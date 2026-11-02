import type { z } from "zod";

import type { projectCreateSchema, projectUpdateSchema } from "./projects.schema.js";

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
