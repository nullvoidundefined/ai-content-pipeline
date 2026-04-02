import { app } from 'app/app.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_EMAIL = 'batches-crud@integration-test.invalid';
const TEST_PASSWORD = 'testpassword123';

describe('Batches Integration', () => {
  let server: Server;
  let csrfToken: string;
  let csrfCookie: string;
  let sessionCookie: string;
  let batchId: string;

  beforeAll(async () => {
    server = app.listen(0);

    // Register and get session
    const tokenRes = await request(server).get('/api/csrf-token');
    csrfToken = tokenRes.body.token;
    csrfCookie =
      (tokenRes.headers['set-cookie'] as unknown as string[])?.find((c) =>
        c.startsWith('__csrf'),
      ) ?? '';

    const registerRes = await request(server)
      .post('/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    sessionCookie =
      (registerRes.headers['set-cookie'] as unknown as string[])?.find((c) =>
        c.startsWith('sid'),
      ) ?? '';

    // Refresh CSRF token after register
    const freshToken = await request(server)
      .get('/api/csrf-token')
      .set('Cookie', [csrfCookie, sessionCookie].join('; '));
    csrfToken = freshToken.body.token;
    csrfCookie =
      (freshToken.headers['set-cookie'] as unknown as string[])?.find((c) =>
        c.startsWith('__csrf'),
      ) ?? csrfCookie;
  });

  afterAll(() => {
    server?.close();
  });

  it('POST /batches creates a batch with items', async () => {
    const res = await request(server)
      .post('/batches')
      .set('Cookie', [csrfCookie, sessionCookie].join('; '))
      .set('X-CSRF-Token', csrfToken)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        items: [
          {
            type: 'text',
            text: 'Integration test content to summarize.',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.batch).toBeDefined();
    expect(res.body.data.batch.id).toBeDefined();
    expect(res.body.data.items).toHaveLength(1);
    batchId = res.body.data.batch.id;
  });

  it('GET /batches lists user batches', async () => {
    const res = await request(server)
      .get('/batches')
      .set('Cookie', [csrfCookie, sessionCookie].join('; '))
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /batches/:id returns the batch', async () => {
    const res = await request(server)
      .get(`/batches/${batchId}`)
      .set('Cookie', [csrfCookie, sessionCookie].join('; '))
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(batchId);
  });

  it('GET /batches/:id/items returns batch items', async () => {
    const res = await request(server)
      .get(`/batches/${batchId}/items`)
      .set('Cookie', [csrfCookie, sessionCookie].join('; '))
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /batches without auth returns 401', async () => {
    const tokenRes = await request(server).get('/api/csrf-token');
    const anonCsrf = tokenRes.body.token;
    const anonCsrfCookie =
      (tokenRes.headers['set-cookie'] as unknown as string[])?.find((c) =>
        c.startsWith('__csrf'),
      ) ?? '';

    const res = await request(server)
      .post('/batches')
      .set('Cookie', anonCsrfCookie)
      .set('X-CSRF-Token', anonCsrf)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ items: [{ type: 'text', text: 'test' }] });

    expect(res.status).toBe(401);
  });

  it('POST /batches with invalid input returns 400', async () => {
    const res = await request(server)
      .post('/batches')
      .set('Cookie', [csrfCookie, sessionCookie].join('; '))
      .set('X-CSRF-Token', csrfToken)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ items: [] });

    expect(res.status).toBe(400);
  });
});
