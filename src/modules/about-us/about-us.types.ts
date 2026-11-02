import type { z } from "zod";

import type { aboutUsCreateSchema, aboutUsUpdateSchema } from "./about-us.schema.js";

export type AboutUsCreateInput = z.infer<typeof aboutUsCreateSchema>;
export type AboutUsUpdateInput = z.infer<typeof aboutUsUpdateSchema>;
