import type { z } from "zod";

import type { hierarchyCreateSchema, hierarchyUpdateSchema } from "./hierarchy.schema.js";

export type HierarchyCreateInput = z.infer<typeof hierarchyCreateSchema>;
export type HierarchyUpdateInput = z.infer<typeof hierarchyUpdateSchema>;
