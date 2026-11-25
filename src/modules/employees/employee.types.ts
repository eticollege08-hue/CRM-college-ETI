import type { z } from "zod";

import type {
    employeeCreateSchema,
    employeeListSchema,
    employeeSalaryUpdateSchema,
    employeeUpdateSchema,
} from "./employee.schema.js";

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeeSalaryUpdateInput = z.infer<typeof employeeSalaryUpdateSchema>;

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListSchema>;
