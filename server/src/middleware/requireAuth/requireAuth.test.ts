import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/repositories/auth/auth.js', () => ({
  getSessionWithUser: vi.fn(),
}));

import * as authRepo from 'app/repositories/auth/auth.js';
import { loadSession, requireAuth } from './requireAuth.js';

function mockReq(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('requireAuth middleware', () => {
  it('returns 401 when req.user is not set', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Authentication required' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when req.user is set', () => {
    const req = mockReq();
    (req as any).user = { id: 'user-1', email: 'test@test.com' };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('loadSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next without setting user when no cookie exists', async () => {
    const req = mockReq({});
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('calls next without setting user when cookie is not a string', async () => {
    const req = mockReq();
    (req as any).cookies = { sid: 123 };
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('sets req.user when session is valid', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      created_at: new Date(),
      updated_at: null,
    };
    vi.mocked(authRepo.getSessionWithUser).mockResolvedValue(mockUser);

    const req = mockReq({ sid: 'valid-session-token' });
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(authRepo.getSessionWithUser).toHaveBeenCalledWith(
      'valid-session-token',
    );
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('does not set req.user when session is expired', async () => {
    vi.mocked(authRepo.getSessionWithUser).mockResolvedValue(null);

    const req = mockReq({ sid: 'expired-token' });
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('calls next with error when getSessionWithUser throws', async () => {
    const error = new Error('DB connection failed');
    vi.mocked(authRepo.getSessionWithUser).mockRejectedValue(error);

    const req = mockReq({ sid: 'some-token' });
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
