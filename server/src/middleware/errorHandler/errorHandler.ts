import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({ err, reqId: req.id }, 'Unhandled error in request handler');

  if (err instanceof ApiError) {
    const body: { error: string; message: string; details?: unknown } = {
      error: err.code,
      message: err.message,
    };
    if (err.details !== undefined) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProd
      ? 'Internal server error'
      : err instanceof Error
        ? err.stack ?? err.message
        : String(err),
  });
}
