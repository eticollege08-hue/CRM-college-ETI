import { z } from "zod";

export const exampleCreateSchema = z.object({
    name: z.string().min(1, "Name must have at least 1 character"),
    description: z.string().min(1, "Description must have at least 1 character")
})

export const exampleUpdateSchema = exampleCreateSchema.partial()