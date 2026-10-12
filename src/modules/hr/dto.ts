import type { Employee, UserAccount, EmployeeCompensation, EmployeeExperience, Ticket } from '@prisma/client';

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Employee DTO: БЕЗ salary/bonus (вони в EmployeeCompensation). */
export const toEmployeeDto = (e: Employee) => ({
  id: e.id,
  full_name: e.full_name,
  image_id: e.image_id,
  level: e.level,
  position: e.position,
  contacts: e.contacts,
  experience_start_date: day(e.experience_start_date),
  status: e.status,
  hired_at: day(e.hired_at),
  manager_id: e.manager_id,
  leave_balance_days: Number(e.leave_balance_days),
  created_at: e.created_at.toISOString(),
  updated_at: e.updated_at.toISOString(),
});

/** password_hash ніколи не віддається назовні. */
export const toAccountDto = (a: UserAccount) => ({
  id: a.id,
  employee_id: a.employee_id,
  email: a.email,
  role_key: a.role_key,
  is_active: a.is_active,
  last_login_at: a.last_login_at?.toISOString() ?? null,
  created_at: a.created_at.toISOString(),
  updated_at: a.updated_at.toISOString(),
});

export const toCompensationDto = (c: EmployeeCompensation) => ({
  id: c.id,
  employee_id: c.employee_id,
  salary: c.salary.toString(), // рядок, щоб не втратити точність Decimal
  currency: c.currency,
});

export const toExperienceDto = (x: EmployeeExperience) => ({
  id: x.id,
  employee_id: x.employee_id,
  company: x.company,
  title: x.title,
  start_date: day(x.start_date),
  end_date: day(x.end_date),
  description: x.description,
});

export const toTicketDto = (t: Ticket) => ({
  id: t.id,
  employee_id: t.employee_id,
  title: t.title,
  description: t.description,
  status: t.status,
  created_at: t.created_at.toISOString(),
  updated_at: t.updated_at.toISOString(),
});