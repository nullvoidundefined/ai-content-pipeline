import { getContentProcessQueue } from 'app/config/queue.js';
import * as batchesRepo from 'app/repositories/batches/batches.js';
import { createBatchSchema } from 'app/schemas/batch.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import { parsePagination } from 'app/utils/parsers/parsePagination.js';
import type { Request, Response } from 'express';

export async function createBatch(req: Request, res: Response): Promise<void> {
  const parsed = createBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    throw ApiError.badRequest(message);
  }

  // Validate each item has the right content for its type
  for (const item of parsed.data.items) {
    if (item.type === 'url' && !item.url) {
      throw ApiError.badRequest('URL items must include a url field');
    }
    if (item.type === 'text' && !item.text) {
      throw ApiError.badRequest('Text items must include a text field');
    }
  }

  const { batch, items } = await batchesRepo.createBatchWithItems(
    req.user!.id,
    parsed.data.items,
  );

  // Enqueue each item for processing
  const queue = getContentProcessQueue();
  if (queue) {
    for (const item of items) {
      await queue.add('process-item', {
        itemId: item.id,
        batchId: batch.id,
        inputType: item.input_type,
        inputUrl: item.input_url,
        inputText: item.input_text,
      });
    }
    logger.info(
      { event: 'batch_created', batchId: batch.id, itemCount: items.length },
      'Batch created and enqueued',
    );
  } else {
    logger.warn(
      { batchId: batch.id },
      'Queue not available — items will not be processed',
    );
  }

  res.status(201).json({ data: { batch, items } });
}

export async function getBatch(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const batch = await batchesRepo.getBatchById(id, req.user!.id);
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  res.json({ data: batch });
}

export async function getBatchItems(
  req: Request,
  res: Response,
): Promise<void> {
  const id = req.params.id as string;
  const { limit, offset } = parsePagination(req);
  const batch = await batchesRepo.getBatchById(id, req.user!.id);
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }
  const { items, total } = await batchesRepo.getBatchItems(
    id,
    req.user!.id,
    limit,
    offset,
  );
  res.json({ data: items, meta: { total, limit, offset } });
}

export async function listBatches(req: Request, res: Response): Promise<void> {
  const { limit, offset } = parsePagination(req);
  const { batches, total } = await batchesRepo.listBatches(
    req.user!.id,
    limit,
    offset,
  );
  res.json({ data: batches, meta: { total, limit, offset } });
}
