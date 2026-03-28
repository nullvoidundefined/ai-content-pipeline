import type { Request } from 'express';

export function parsePagination(req: Request): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
}
