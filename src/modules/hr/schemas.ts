import { z } from 'zod';

const uuid = z.uuid();
const isoDate = z.iso.date(); // YYYY-MM-DD

export const employeeStatus = z.enum(['hired', 'active', 'on_leave', 'fired']);

const employeeFields = z.object({
  full_name: z.string().trim().min(1).max(255),
  image_id: uuid.nullable(),
  level: z.string().trim().min(1).max(50).nullable(),
  position: z.string().trim().min(1).max(150).nullable(),
  contacts: z.record(z.string(), z.unknown()),
  experience_start_date: isoDate.nullable(),
  status: employeeStatus,
  hired_at: isoDate.nullable(),
  manager_id: uuid.nullable(),
  leave_balance_days: z.number().min(0).max(9999.9),
});

// Зарплата/бонуси навмисно відсутні: вони живуть в employee_compensations.
export const createEmployeeSchema = employeeFields.partial().extend({ full_name: employeeFields.shape.full_name });
export const updateEmployeeSchema = employeeFields.partial();

export const listEmployeesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: employeeStatus.optional(),
  manager_id: uuid.optional(),
});

const email = z.string().trim().toLowerCase().pipe(z.email().max(255));
const roleKey = z.string().regex(/^[a-z][a-z0-9_.-]{1,63}$/);
const password = z.string().min(8).max(128);

export const createAccountSchema = z.object({
  employee_id: uuid,
  email,
  password,
  role_key: roleKey,
  is_active: z.boolean().default(true),
});

// employee_id після створення не змінюється
export const updateAccountSchema = z.object({
  email: email.optional(),
  password: password.optional(),
  role_key: roleKey.optional(),
  is_active: z.boolean().optional(),
});

export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idSchema = uuid;