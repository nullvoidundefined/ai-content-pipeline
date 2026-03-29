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
  it('returns 500 with stack in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect((res._body as any).error.message).toContain('Something broke');

    process.env.NODE_ENV = originalEnv;
  });

  it('returns generic message in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Sensitive details');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect((res._body as any).error.message).toBe('Internal server error');

    process.env.NODE_ENV = originalEnv;
  });

  it('handles non-Error objects', () => {
    process.env.NODE_ENV = 'test';
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler('string error', req, res, next);

    expect(res._status).toBe(500);
    expect((res._body as any).error.message).toBe('string error');
  });
});
