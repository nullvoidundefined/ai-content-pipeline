import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from 'app/utils/ApiError.js';

vi.mock('app/repositories/batches/batches.js', () => ({
  createBatchWithItems: vi.fn(),
  getBatchById: vi.fn(),
  getBatchItems: vi.fn(),
  listBatches: vi.fn(),
}));

vi.mock('app/config/queue.js', () => ({
  getContentProcessQueue: vi.fn(),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getContentProcessQueue } from 'app/config/queue.js';
import * as batchesRepo from 'app/repositories/batches/batches.js';
import { createBatch, getBatch, getBatchItems, listBatches } from './batches.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 'user-1', email: 'test@test.com' },
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 200,
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

describe('createBatch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws VALIDATION_ERROR for invalid input', async () => {
    const req = mockReq({ body: { items: [] } });
    const res = mockRes();

    await expect(createBatch(req, res)).rejects.toThrow(ApiError);
    await expect(createBatch(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws VALIDATION_ERROR for URL item without url field', async () => {
    const req = mockReq({
      body: { items: [{ type: 'url' }] },
    });
    const res = mockRes();

    await expect(createBatch(req, res)).rejects.toThrow(ApiError);
    await expect(createBatch(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'URL items must include a url field',
    });
  });

  it('throws VALIDATION_ERROR for text item without text field', async () => {
    const req = mockReq({
      body: { items: [{ type: 'text' }] },
    });
    const res = mockRes();

    await expect(createBatch(req, res)).rejects.toThrow(ApiError);
    await expect(createBatch(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Text items must include a text field',
    });
  });

  it('creates batch and enqueues items when queue is available', async () => {
    const mockBatch = { id: 'batch-1', user_id: 'user-1', status: 'pending' };
    const mockItems = [
      { id: 'item-1', batch_id: 'batch-1', input_type: 'url', input_url: 'https://example.com', input_text: null },
    ];
    vi.mocked(batchesRepo.createBatchWithItems).mockResolvedValue({
      batch: mockBatch as any,
      items: mockItems as any,
    });

    const mockQueueAdd = vi.fn();
    vi.mocked(getContentProcessQueue).mockReturnValue({ add: mockQueueAdd } as any);

    const req = mockReq({
      body: { items: [{ type: 'url', url: 'https://example.com' }] },
    });
    const res = mockRes();

    await createBatch(req, res);

    expect(res._status).toBe(201);
    expect((res._body as any).data.batch.id).toBe('batch-1');
    expect(mockQueueAdd).toHaveBeenCalledWith('process-item', expect.objectContaining({
      itemId: 'item-1',
      batchId: 'batch-1',
    }));
  });

  it('creates batch without enqueuing when queue is unavailable', async () => {
    const mockBatch = { id: 'batch-2', user_id: 'user-1', status: 'pending' };
    vi.mocked(batchesRepo.createBatchWithItems).mockResolvedValue({
      batch: mockBatch as any,
      items: [],
    });
    vi.mocked(getContentProcessQueue).mockReturnValue(null);

    const req = mockReq({
      body: { items: [{ type: 'text', text: 'Some content' }] },
    });
    const res = mockRes();

    await createBatch(req, res);

    expect(res._status).toBe(201);
  });
});

describe('getBatch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns batch when found', async () => {
    const mockBatch = { id: 'batch-1', user_id: 'user-1', status: 'complete' };
    vi.mocked(batchesRepo.getBatchById).mockResolvedValue(mockBatch as any);

    const req = mockReq({ params: { id: 'batch-1' } as any });
    const res = mockRes();

    await getBatch(req, res);

    expect((res._body as any).data).toEqual(mockBatch);
  });

  it('throws NOT_FOUND when batch not found', async () => {
    vi.mocked(batchesRepo.getBatchById).mockResolvedValue(null);

    const req = mockReq({ params: { id: 'nonexistent' } as any });
    const res = mockRes();

    await expect(getBatch(req, res)).rejects.toThrow(ApiError);
    await expect(getBatch(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('getBatchItems handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns items with pagination meta', async () => {
    vi.mocked(batchesRepo.getBatchById).mockResolvedValue({ id: 'batch-1' } as any);
    vi.mocked(batchesRepo.getBatchItems).mockResolvedValue({
      items: [{ id: 'item-1' }] as any,
      total: 1,
    });

    const req = mockReq({ params: { id: 'batch-1' } as any });
    const res = mockRes();

    await getBatchItems(req, res);

    expect((res._body as any).data).toHaveLength(1);
    expect((res._body as any).meta.total).toBe(1);
  });

  it('throws NOT_FOUND when batch not found', async () => {
    vi.mocked(batchesRepo.getBatchById).mockResolvedValue(null);

    const req = mockReq({ params: { id: 'nonexistent' } as any });
    const res = mockRes();

    await expect(getBatchItems(req, res)).rejects.toThrow(ApiError);
    await expect(getBatchItems(req, res)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('listBatches handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns batches with pagination meta', async () => {
    vi.mocked(batchesRepo.listBatches).mockResolvedValue({
      batches: [{ id: 'batch-1' }, { id: 'batch-2' }] as any,
      total: 2,
    });

    const req = mockReq();
    const res = mockRes();

    await listBatches(req, res);

    expect((res._body as any).data).toHaveLength(2);
    expect((res._body as any).meta.total).toBe(2);
  });
});
