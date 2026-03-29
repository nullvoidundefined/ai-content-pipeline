import { ApiError } from 'app/utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(ApiError.notFound('Not found'));
}
