import type { z } from "zod";

import type {
    estimateCreateSchema,
    estimateUpdateSchema,
    estimateListQuerySchema,
} from "./estimate.schema.js";

export type EstimateCreateInput = z.infer<typeof estimateCreateSchema>;
export type EstimateUpdateInput = z.infer<typeof estimateUpdateSchema>;
export type EstimateListQuery = z.infer<typeof estimateListQuerySchema>;

export interface EstimatePaginationMeta {
    totalCount: number;
    page: number;
    pageSize: number;
}
