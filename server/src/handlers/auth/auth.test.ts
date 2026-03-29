import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/repositories/auth/auth.js', () => ({
  createUserAndSession: vi.fn(),
  findUserByEmail: vi.fn(),
  verifyPassword: vi.fn(),
  loginUser: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock('app/config/env.js', () => ({
  isProduction: vi.fn().mockReturnValue(false),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import * as authRepo from 'app/repositories/auth/auth.js';
import { login, logout, me, register } from './auth.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    cookies: {},
    ip: '127.0.0.1',
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _body: unknown; _cookies: Record<string, any>; _clearedCookies: string[] } {
  const res = {
    _status: 200,
    _body: null,
    _cookies: {} as Record<string, any>,
    _clearedCookies: [] as string[],
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
    cookie(name: string, value: unknown, options: unknown) {
      res._cookies[name] = { value, options };
      return res;
    },
    clearCookie(name: string) {
      res._clearedCookies.push(name);
      return res;
    },
    send() {
      return res;
    },
  } as unknown as Response & { _status: number; _body: unknown; _cookies: Record<string, any>; _clearedCookies: string[] };
  return res;
}

describe('register handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid input', async () => {
    const req = mockReq({ body: { email: 'bad', password: 'x' } });
    const res = mockRes();

    await register(req, res);

    expect(res._status).toBe(400);
  });

  it('creates user and sets session cookie on success', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com', created_at: new Date() };
    vi.mocked(authRepo.createUserAndSession).mockResolvedValue({
      user: mockUser as any,
      sessionId: 'session-abc',
    });

    const req = mockReq({ body: { email: 'test@test.com', password: 'securepass' } });
    const res = mockRes();

    await register(req, res);

    expect(res._status).toBe(201);
    expect(res._cookies.sid.value).toBe('session-abc');
    expect((res._body as any).user.id).toBe('user-1');
  });

  it('returns 409 for duplicate email', async () => {
    const err = new Error('duplicate');
    (err as any).code = '23505';
    vi.mocked(authRepo.createUserAndSession).mockRejectedValue(err);

    const req = mockReq({ body: { email: 'dup@test.com', password: 'securepass' } });
    const res = mockRes();

    await register(req, res);

    expect(res._status).toBe(409);
    expect((res._body as any).error.message).toContain('already registered');
  });

  it('rethrows non-duplicate errors', async () => {
    vi.mocked(authRepo.createUserAndSession).mockRejectedValue(new Error('DB down'));

    const req = mockReq({ body: { email: 'test@test.com', password: 'securepass' } });
    const res = mockRes();

    await expect(register(req, res)).rejects.toThrow('DB down');
  });
});

describe('login handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid input', async () => {
    const req = mockReq({ body: { email: 'bad' } });
    const res = mockRes();

    await login(req, res);

    expect(res._status).toBe(400);
  });

  it('returns 401 for unknown email', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);

    const req = mockReq({ body: { email: 'unknown@test.com', password: 'password' } });
    const res = mockRes();

    await login(req, res);

    expect(res._status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      password_hash: 'hash',
      created_at: new Date(),
      updated_at: null,
    });
    vi.mocked(authRepo.verifyPassword).mockResolvedValue(false);

    const req = mockReq({ body: { email: 'test@test.com', password: 'wrong' } });
    const res = mockRes();

    await login(req, res);

    expect(res._status).toBe(401);
  });

  it('sets cookie and returns user on success', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      password_hash: 'hash',
      created_at: new Date(),
      updated_at: null,
    });
    vi.mocked(authRepo.verifyPassword).mockResolvedValue(true);
    vi.mocked(authRepo.loginUser).mockResolvedValue('session-xyz');

    const req = mockReq({ body: { email: 'test@test.com', password: 'correct' } });
    const res = mockRes();

    await login(req, res);

    expect(res._status).toBe(200);
    expect(res._cookies.sid.value).toBe('session-xyz');
    expect((res._body as any).user.id).toBe('user-1');
  });
});

describe('logout handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears cookie and deletes session', async () => {
    vi.mocked(authRepo.deleteSession).mockResolvedValue(true);

    const req = mockReq({ cookies: { sid: 'session-token' } });
    const res = mockRes();

    await logout(req, res);

    expect(authRepo.deleteSession).toHaveBeenCalledWith('session-token');
    expect(res._status).toBe(204);
    expect(res._clearedCookies).toContain('sid');
  });

  it('handles missing cookie gracefully', async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();

    await logout(req, res);

    expect(authRepo.deleteSession).not.toHaveBeenCalled();
    expect(res._status).toBe(204);
  });

  it('handles session deletion failure gracefully', async () => {
    vi.mocked(authRepo.deleteSession).mockRejectedValue(new Error('Redis down'));

    const req = mockReq({ cookies: { sid: 'session-token' } });
    const res = mockRes();

    await logout(req, res);

    expect(res._status).toBe(204);
  });
});

describe('me handler', () => {
  it('returns the current user', async () => {
    const user = { id: 'user-1', email: 'test@test.com' };
    const req = mockReq({ user } as any);
    const res = mockRes();

    await me(req, res);

    expect((res._body as any).user).toEqual(user);
  });
});
