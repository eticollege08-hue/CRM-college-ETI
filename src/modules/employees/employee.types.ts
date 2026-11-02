import type { z } from "zod";

import type { employeeUpdateSchema } from "./employee.schema.js";

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
