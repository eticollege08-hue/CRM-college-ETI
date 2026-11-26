import { z } from "zod";
export const teamSchema = z.strictObject({ name: z.string().trim().min(1).max(100) });
export const memberSchema = z.strictObject({ employeeId: z.uuid() });
export const memberParamsSchema = memberSchema.extend({ id: z.uuid() });
export const projectTeamSchema = z.strictObject({ teamId: z.uuid() });
