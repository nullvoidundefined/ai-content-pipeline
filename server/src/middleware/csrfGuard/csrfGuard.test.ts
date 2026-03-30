import cookieParser from 'cookie-parser';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { beforeAll, describe, expect, it } from 'vitest';

import { csrfGuard, generateCsrfToken } from './csrfGuard.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Token endpoint before CSRF guard — GET is safe
  app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ token });
  });

  app.use(csrfGuard);

  app.post('/api/test', (_req, res) => {
    res.json({ ok: true });
  });

  app.put('/api/test', (_req, res) => {
    res.json({ ok: true });
  });

  app.delete('/api/test', (_req, res) => {
    res.json({ ok: true });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(403).json({ error: err.message });
  });

  return app;
}

describe('CSRF middleware', () => {
  let app: express.Express;

  beforeAll(() => {
    process.env.CSRF_SECRET = 'test-csrf-secret-at-least-32-chars-long!!';
    app = createTestApp();
  });

  it('returns 403 for POST without CSRF token', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).post('/api/test').send({ data: 'test' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for DELETE without CSRF token', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).delete('/api/test');
    expect(res.status).toBe(403);
  });

  it('allows GET requests and returns CSRF token', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).get('/api/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('allows POST with valid CSRF token', async () => {
    const { default: request } = await import('supertest');

    // First get a token
    const tokenRes = await request(app).get('/api/csrf-token');
    const { token } = tokenRes.body;
    const cookies = tokenRes.headers['set-cookie'];

    expect(token).toBeDefined();

    // Then use it in a POST
    const res = await request(app)
      .post('/api/test')
      .set('x-csrf-token', token)
      .set('Cookie', cookies!)
      .send({ data: 'test' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
