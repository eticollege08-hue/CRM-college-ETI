import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const hrErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({ error: 'validation_error', issues: err.issues });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 — порушення UNIQUE (email, employee_id вже має акаунт)
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'conflict', message: 'Unique constraint violated', target: err.meta?.target });
      return;
    }
    // P2003 — порушення FK: при створенні/оновленні — 422, при видаленні — 409
    if (err.code === 'P2003') {
      const status = req.method === 'DELETE' ? 409 : 422;
      res.status(status).json({ error: 'fk_violation', message: 'Referenced record is missing or still in use', field: err.meta?.field_name });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
};