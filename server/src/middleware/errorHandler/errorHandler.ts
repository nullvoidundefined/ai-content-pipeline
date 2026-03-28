import { logger } from 'app/utils/logs/logger.js';
import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error({ err, reqId: req.id }, 'Unhandled error in request handler');

  res.status(status).json({
    error: {
      message: isProd
        ? 'Internal server error'
        : err instanceof Error
          ? err.stack
          : String(err),
    },
  });
}
