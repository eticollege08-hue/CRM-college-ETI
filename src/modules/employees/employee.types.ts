import type { z } from "zod";

import type { employeeCreateSchema, employeeUpdateSchema } from "./employee.schema.js";

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
