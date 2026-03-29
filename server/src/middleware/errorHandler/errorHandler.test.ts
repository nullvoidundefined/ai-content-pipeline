import { ApiError } from 'app/utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from './errorHandler.js';

vi.mock('app/utils/logs/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function mockReq(): Request {
  return { id: 'req-1' } as unknown as Request;
}

function mockRes(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: null,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  } as unknown as Response & { _status: number; _body: unknown };
  return res;
}

describe('errorHandler', () => {
  it('returns ApiError status and code for ApiError instances', () => {
    const err = ApiError.notFound('Batch not found');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res._status).toBe(404);
    expect((res._body as any).error).toBe('NOT_FOUND');
    expect((res._body as any).message).toBe('Batch not found');
    expect((res._body as any).details).toBeUndefined();
  });

  it('includes details when ApiError has details', () => {
    const err = ApiError.badRequest('Invalid input', { field: 'email' });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res._status).toBe(400);
    expect((res._body as any).error).toBe('VALIDATION_ERROR');
    expect((res._body as any).message).toBe('Invalid input');
    expect((res._body as any).details).toEqual({ field: 'email' });
  });

  it('returns 500 with stack in non-production for plain errors', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect((res._body as any).error).toBe('INTERNAL_ERROR');
    expect((res._body as any).message).toContain('Something broke');

    process.env.NODE_ENV = originalEnv;
  });

  it('returns generic message in production for plain errors', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Sensitive details');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect((res._body as any).error).toBe('INTERNAL_ERROR');
    expect((res._body as any).message).toBe('Internal server error');

    process.env.NODE_ENV = originalEnv;
  });

  it('handles non-Error objects', () => {
    process.env.NODE_ENV = 'test';
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler('string error', req, res, next);

    expect(res._status).toBe(500);
    expect((res._body as any).error).toBe('INTERNAL_ERROR');
    expect((res._body as any).message).toBe('string error');
  });

  it('handles all static factory methods', () => {
    const cases = [
      { err: ApiError.unauthorized(), status: 401, code: 'UNAUTHORIZED' },
      { err: ApiError.forbidden(), status: 403, code: 'FORBIDDEN' },
      { err: ApiError.rateLimited(), status: 429, code: 'RATE_LIMITED' },
      { err: ApiError.aiServiceError(), status: 502, code: 'AI_SERVICE_ERROR' },
      { err: ApiError.internal(), status: 500, code: 'INTERNAL_ERROR' },
    ];

    for (const { err, status, code } of cases) {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res._status).toBe(status);
      expect((res._body as any).error).toBe(code);
    }
  });
});
