import { query, withTransaction } from "app/db/pool/pool.js";
import type { PoolClient } from "app/db/pool/pool.js";
import type { Batch, BatchItem, InputType } from "app/schemas/batch.js";

interface CreateItemInput {
  type: InputType;
  url?: string;
  text?: string;
}

export async function createBatchWithItems(
  userId: string,
  items: CreateItemInput[],
): Promise<{ batch: Batch; items: BatchItem[] }> {
  return withTransaction(async (client) => {
    const batchResult = await query<Batch>(
      `INSERT INTO batches (user_id, status, total_items, completed_items, failed_items)
       VALUES ($1, 'pending', $2, 0, 0)
       RETURNING *`,
      [userId, items.length],
      client,
    );
    const batch = batchResult.rows[0];
    if (!batch) throw new Error("Insert returned no row");

    const createdItems: BatchItem[] = [];
    for (const item of items) {
      const itemResult = await query<BatchItem>(
        `INSERT INTO batch_items (batch_id, input_type, input_url, input_text, status, attempts)
         VALUES ($1, $2, $3, $4, 'queued', 0)
         RETURNING *`,
        [batch.id, item.type, item.url ?? null, item.text ?? null],
        client,
      );
      const row = itemResult.rows[0];
      if (!row) throw new Error("Insert returned no row");
      createdItems.push(row);
    }

    return { batch, items: createdItems };
  });
}

export async function getBatchById(batchId: string, userId: string): Promise<Batch | null> {
  const result = await query<Batch>(
    `SELECT * FROM batches WHERE id = $1 AND user_id = $2`,
    [batchId, userId],
  );
  return result.rows[0] ?? null;
}

export async function getBatchItems(
  batchId: string,
  userId: string,
  limit: number,
  offset: number,
): Promise<{ items: BatchItem[]; total: number }> {
  const [dataResult, countResult] = await Promise.all([
    query<BatchItem>(
      `SELECT bi.* FROM batch_items bi
       INNER JOIN batches b ON b.id = bi.batch_id
       WHERE bi.batch_id = $1 AND b.user_id = $2
       ORDER BY bi.created_at ASC
       LIMIT $3 OFFSET $4`,
      [batchId, userId, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM batch_items bi
       INNER JOIN batches b ON b.id = bi.batch_id
       WHERE bi.batch_id = $1 AND b.user_id = $2`,
      [batchId, userId],
    ),
  ]);
  return {
    items: dataResult.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function listBatches(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ batches: Batch[]; total: number }> {
  const [dataResult, countResult] = await Promise.all([
    query<Batch>(
      `SELECT * FROM batches WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM batches WHERE user_id = $1`,
      [userId],
    ),
  ]);
  return {
    batches: dataResult.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function updateItemStatus(
  itemId: string,
  status: string,
  error?: string,
  client?: PoolClient,
): Promise<BatchItem | null> {
  const result = await query<BatchItem>(
    `UPDATE batch_items
     SET status = $1, error = $2, attempts = attempts + 1,
         processed_at = CASE WHEN $1 IN ('complete', 'failed') THEN NOW() ELSE processed_at END
     WHERE id = $3
     RETURNING *`,
    [status, error ?? null, itemId],
    client,
  );
  return result.rows[0] ?? null;
}

export async function updateItemResults(
  itemId: string,
  results: {
    classification?: Record<string, unknown>;
    entities?: Record<string, unknown>;
    tags?: string[];
    summary?: string;
  },
): Promise<BatchItem | null> {
  const result = await query<BatchItem>(
    `UPDATE batch_items
     SET status = 'complete',
         classification = COALESCE($1, classification),
         entities = COALESCE($2, entities),
         tags = COALESCE($3, tags),
         summary = COALESCE($4, summary),
         attempts = attempts + 1,
         processed_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      results.classification ? JSON.stringify(results.classification) : null,
      results.entities ? JSON.stringify(results.entities) : null,
      results.tags ?? null,
      results.summary ?? null,
      itemId,
    ],
  );
  return result.rows[0] ?? null;
}

export async function updateBatchCounts(batchId: string): Promise<Batch | null> {
  const result = await query<Batch>(
    `UPDATE batches SET
       completed_items = (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status = 'complete'),
       failed_items = (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status = 'failed'),
       status = CASE
         WHEN (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status IN ('queued', 'processing')) = 0
              AND (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1) > 0
         THEN CASE
           WHEN (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status = 'failed') = (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1)
           THEN 'failed'
           ELSE 'complete'
         END
         ELSE 'processing'
       END,
       completed_at = CASE
         WHEN (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status IN ('queued', 'processing')) = 0
         THEN NOW()
         ELSE NULL
       END
     WHERE id = $1
     RETURNING *`,
    [batchId],
  );
  return result.rows[0] ?? null;
}

export async function getItemById(itemId: string): Promise<BatchItem | null> {
  const result = await query<BatchItem>(
    `SELECT * FROM batch_items WHERE id = $1`,
    [itemId],
  );
  return result.rows[0] ?? null;
}
