import type { Express } from 'express';
import { apiRouter } from './api.router.js';
import { ssrRouter } from './ssr.router.js';

/** Підключати в app.ts ДО 404/глобального error-handler. */
export function registerHr(app: Express) {
  app.use('/api', apiRouter); // JSON CRUD + /api/docs + /api/openapi.json
  app.use(ssrRouter); // SSR: /employees, /employees/:id
}