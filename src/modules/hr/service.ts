import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import { HttpError } from './errors.js';
import { toAccountDto, toCompensationDto, toEmployeeDto, toExperienceDto, toTicketDto } from './dto.js';

type Obj = Record<string, unknown>;

const withDates = (data: Obj): Obj => {
  const out = { ...data };
  for (const k of ['experience_start_date', 'hired_at']) {
    if (typeof out[k] === 'string') out[k] = new Date(out[k] as string);
  }
  return out;
};

/* ---------- Employee ---------- */

export const listEmployees = (q: { limit: number; offset: number; status?: string; manager_id?: string }) =>
  prisma.employee.findMany({
    where: { ...(q.status && { status: q.status as never }), ...(q.manager_id && { manager_id: q.manager_id }) },
    orderBy: { full_name: 'asc' },
    take: q.limit,
    skip: q.offset,
  });

export const getEmployee = async (id: string) => {
  const e = await prisma.employee.findUnique({ where: { id } });
  if (!e) throw new HttpError(404, 'not_found', 'Employee not found');
  return e;
};

/** Захист від циклів в ієрархії: manager не може бути нащадком самого працівника. */
async function assertNoCycle(id: string, managerId: string) {
  const seen = new Set<string>();
  let cur: string | null = managerId;
  while (cur) {
    if (cur === id) throw new HttpError(422, 'manager_cycle', 'Manager hierarchy cannot contain a cycle');
    if (seen.has(cur)) break;
    seen.add(cur);
    const row: { manager_id: string | null } | null = await prisma.employee.findUnique({
      where: { id: cur },
      select: { manager_id: true },
    });
    if (!row) throw new HttpError(422, 'manager_not_found', 'manager_id does not exist');
    cur = row.manager_id;
  }
}

export const createEmployee = (data: Obj) =>
  prisma.employee.create({ data: withDates(data) as Prisma.EmployeeUncheckedCreateInput });

export const updateEmployee = async (id: string, data: Obj) => {
  if (typeof data.manager_id === 'string') await assertNoCycle(id, data.manager_id);
  return prisma.employee.update({ where: { id }, data: withDates(data) as Prisma.EmployeeUncheckedUpdateInput });
};

export const deleteEmployee = (id: string) => prisma.employee.delete({ where: { id } });

/** Використовує індекс employees_manager_id_idx. */
export const listSubordinates = (managerId: string) =>
  prisma.employee.findMany({ where: { manager_id: managerId }, orderBy: { full_name: 'asc' } });

/* ---------- UserAccount ---------- */

export const listAccounts = (q: { limit: number; offset: number }) =>
  prisma.userAccount.findMany({ orderBy: { created_at: 'desc' }, take: q.limit, skip: q.offset });

export const getAccount = async (id: string) => {
  const a = await prisma.userAccount.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, 'not_found', 'Account not found');
  return a;
};

export const createAccount = async (d: { employee_id: string; email: string; password: string; role_key: string; is_active: boolean }) => {
  const { password, ...rest } = d;
  return prisma.userAccount.create({ data: { ...rest, password_hash: await bcrypt.hash(password, 12) } });
};

export const updateAccount = async (id: string, d: { email?: string; password?: string; role_key?: string; is_active?: boolean }) => {
  const { password, ...rest } = d;
  return prisma.userAccount.update({
    where: { id },
    data: { ...rest, ...(password ? { password_hash: await bcrypt.hash(password, 12) } : {}) },
  });
};

export const deleteAccount = (id: string) => prisma.userAccount.delete({ where: { id } });

/* ---------- Card entities (read) ---------- */

export const getCompensation = async (employeeId: string) => {
  const c = await prisma.employeeCompensation.findUnique({ where: { employee_id: employeeId } });
  if (!c) throw new HttpError(404, 'not_found', 'Compensation not found');
  return c;
};
export const listExperience = (employeeId: string) =>
  prisma.employeeExperience.findMany({ where: { employee_id: employeeId }, orderBy: { start_date: 'desc' } });
export const listTickets = (employeeId: string) =>
  prisma.ticket.findMany({ where: { employee_id: employeeId }, orderBy: { created_at: 'desc' } });

/* ---------- SSR: дані для картки співробітника ---------- */

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export async function getEmployeeCard(id: string) {
  const e = await prisma.employee.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, full_name: true, position: true } },
      subordinates: { select: { id: true, full_name: true, position: true, status: true }, orderBy: { full_name: 'asc' } },
      account: { select: { email: true, role_key: true, is_active: true, last_login_at: true } },
      compensation: true,
      experiences: { orderBy: { start_date: 'desc' } },
      tickets: { orderBy: { created_at: 'desc' }, take: 20 },
    },
  });
  if (!e) throw new HttpError(404, 'not_found', 'Employee not found');

  const dto = toEmployeeDto(e);
  const years = e.experience_start_date
    ? Math.floor(((Date.now() - e.experience_start_date.getTime()) / (365.25 * 864e5)) * 10) / 10
    : null;

  return {
    employee: dto,
    initials: initials(e.full_name),
    experience_years: years,
    manager: e.manager,
    subordinates: e.subordinates,
    account: e.account && { ...e.account, last_login_at: e.account.last_login_at?.toISOString() ?? null },
    compensation: e.compensation ? toCompensationDto(e.compensation) : null,
    experience: e.experiences.map(toExperienceDto),
    tickets: e.tickets.map(toTicketDto),
  };
}

export { toAccountDto, toEmployeeDto };