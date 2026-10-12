import type { RequestHandler } from 'express';

/**
 * Тимчасова "брама": відкрито лише поза production (NODE_ENV=production
 * виставляється в Dockerfile runtime-стадії).
 * TODO(CRM-102.3): замінити на RBAC-guard (closed by default).
 */
export const devOnly: RequestHandler = (_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'forbidden', message: 'Endpoint is closed until RBAC guards are enabled' });
    return;
  }
  next();
};