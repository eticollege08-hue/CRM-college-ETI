import express, { Router } from 'express';
import { devOnly } from '#middlewares/dev-only.middleware.js';
import { hrErrorHandler } from './errors.js';
import { openapi } from './openapi.js';
import {
  createAccountSchema, createEmployeeSchema, idSchema, listEmployeesQuery, listQuery,
  updateAccountSchema, updateEmployeeSchema,
} from './schemas.js';
import * as svc from './service.js';
import { toAccountDto, toCompensationDto, toEmployeeDto, toExperienceDto, toTicketDto } from './dto.js';

export const apiRouter = Router();

// Підключений на /api, тому guard і json-парсер вішаємо лише на наші шляхи.
// TODO(CRM-102.3): devOnly -> RBAC guard
const paths = ['/employees', '/user-accounts', '/docs', '/openapi.json'];
apiRouter.use(paths, devOnly);
apiRouter.use(['/employees', '/user-accounts'], express.json());

/* ---- OpenAPI ---- */
apiRouter.get('/openapi.json', (_req, res) => void res.json(openapi));
apiRouter.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>CRM API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#ui' });</script></body></html>`);
});

/* ---- Employees ---- */
apiRouter.get('/employees', async (req, res) => {
  const q = listEmployeesQuery.parse(req.query);
  const rows = await svc.listEmployees(q);
  res.json({ data: rows.map(toEmployeeDto), limit: q.limit, offset: q.offset });
});
apiRouter.post('/employees', async (req, res) => {
  const body = createEmployeeSchema.parse(req.body);
  res.status(201).json(toEmployeeDto(await svc.createEmployee(body)));
});
apiRouter.get('/employees/:id', async (req, res) => {
  res.json(toEmployeeDto(await svc.getEmployee(idSchema.parse(req.params.id))));
});
apiRouter.patch('/employees/:id', async (req, res) => {
  const body = updateEmployeeSchema.parse(req.body);
  res.json(toEmployeeDto(await svc.updateEmployee(idSchema.parse(req.params.id), body)));
});
apiRouter.delete('/employees/:id', async (req, res) => {
  await svc.deleteEmployee(idSchema.parse(req.params.id));
  res.status(204).end();
});
apiRouter.get('/employees/:id/subordinates', async (req, res) => {
  const rows = await svc.listSubordinates(idSchema.parse(req.params.id));
  res.json({ data: rows.map(toEmployeeDto) });
});
apiRouter.get('/employees/:id/compensation', async (req, res) => {
  res.json(toCompensationDto(await svc.getCompensation(idSchema.parse(req.params.id))));
});
apiRouter.get('/employees/:id/experience', async (req, res) => {
  const rows = await svc.listExperience(idSchema.parse(req.params.id));
  res.json({ data: rows.map(toExperienceDto) });
});
apiRouter.get('/employees/:id/tickets', async (req, res) => {
  const rows = await svc.listTickets(idSchema.parse(req.params.id));
  res.json({ data: rows.map(toTicketDto) });
});

/* ---- User accounts ---- */
apiRouter.get('/user-accounts', async (req, res) => {
  const q = listQuery.parse(req.query);
  const rows = await svc.listAccounts(q);
  res.json({ data: rows.map(toAccountDto), limit: q.limit, offset: q.offset });
});
// Немає Employee -> FK (P2003) -> 422; другий акаунт для Employee -> UNIQUE (P2002) -> 409
apiRouter.post('/user-accounts', async (req, res) => {
  const body = createAccountSchema.parse(req.body);
  res.status(201).json(toAccountDto(await svc.createAccount(body)));
});
apiRouter.get('/user-accounts/:id', async (req, res) => {
  res.json(toAccountDto(await svc.getAccount(idSchema.parse(req.params.id))));
});
apiRouter.patch('/user-accounts/:id', async (req, res) => {
  const body = updateAccountSchema.parse(req.body);
  res.json(toAccountDto(await svc.updateAccount(idSchema.parse(req.params.id), body)));
});
apiRouter.delete('/user-accounts/:id', async (req, res) => {
  await svc.deleteAccount(idSchema.parse(req.params.id));
  res.status(204).end();
});

apiRouter.use(hrErrorHandler);