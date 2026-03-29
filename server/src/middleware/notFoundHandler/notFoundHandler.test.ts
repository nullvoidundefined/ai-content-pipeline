import { ApiError } from 'app/utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { notFoundHandler } from './notFoundHandler.js';

describe('notFoundHandler', () => {
  it('calls next with NOT_FOUND ApiError', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = (next as any).mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Not found');
  });
});
