import type { NextFunction, Request, Response } from 'express';
import { ApiError } from 'app/utils/ApiError.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Not found'));
}
