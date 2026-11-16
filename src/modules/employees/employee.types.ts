import type { z } from "zod";

import type { employeeSalaryUpdateSchema, employeeUpdateSchema } from "./employee.schema.js";

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeeSalaryUpdateInput = z.infer<typeof employeeSalaryUpdateSchema>;
