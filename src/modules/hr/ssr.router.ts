import path from 'node:path';
import { Router } from 'express';
import nunjucks from 'nunjucks';
import { devOnly } from '#middlewares/dev-only.middleware.js';
import { HttpError } from './errors.js';
import { idSchema, listEmployeesQuery } from './schemas.js';
import * as svc from './service.js';

// Окреме середовище nunjucks, щоб не залежати від конфігурації в app.ts.
// У Docker src/views копіюється в runtime (див. Dockerfile), cwd = /app.
const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(path.resolve(process.cwd(), 'src/views')),
  { autoescape: true },
);

export const ssrRouter = Router();

// Підключений на "/", тому guard — лише на наших шляхах. TODO(CRM-102.3): RBAC guard.
ssrRouter.use('/employees', devOnly);

ssrRouter.get('/employees', async (req, res) => {
  const q = listEmployeesQuery.parse(req.query);
  const rows = await svc.listEmployees(q);
  res.type('html').send(env.render('hr/employees-list.njk', { employees: rows.map(svc.toEmployeeDto), query: q }));
});

ssrRouter.get('/employees/:id', async (req, res) => {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) throw new HttpError(404, 'not_found');
  res.type('html').send(env.render('hr/employee-card.njk', await svc.getEmployeeCard(parsed.data)));
});

ssrRouter.use('/employees', (err: unknown, _req: any, res: any, next: any) => {
  if (err instanceof HttpError && err.status === 404) {
    res.status(404).type('html').send(env.render('hr/layout.njk', { not_found: true }));
    return;
  }
  next(err);
});