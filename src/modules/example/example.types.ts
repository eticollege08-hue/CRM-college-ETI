import { z } from "zod";
import { exampleCreateSchema, exampleUpdateSchema } from "./example.schema";

export type ExampleCreateInput = z.infer<typeof exampleCreateSchema>
export type ExampleUpdateInput = z.infer<typeof exampleUpdateSchema>