import { z } from "zod";

export const batchStatusEnum = z.enum(["pending", "processing", "complete", "failed"]);
export const itemStatusEnum = z.enum(["queued", "processing", "complete", "failed"]);
export const inputTypeEnum = z.enum(["url", "text"]);

export const createBatchSchema = z.object({
  items: z
    .array(
      z.object({
        type: inputTypeEnum,
        url: z.string().url("Invalid URL").optional(),
        text: z.string().min(1, "Text content is required").optional(),
      }),
    )
    .min(1, "At least one item is required")
    .max(50, "Maximum 50 items per batch"),
});

export const batchSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: batchStatusEnum,
  total_items: z.number().int(),
  completed_items: z.number().int(),
  failed_items: z.number().int(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
});

export const batchItemSchema = z.object({
  id: z.string().uuid(),
  batch_id: z.string().uuid(),
  input_type: inputTypeEnum,
  input_url: z.string().nullable(),
  input_text: z.string().nullable(),
  status: itemStatusEnum,
  classification: z.record(z.string(), z.unknown()).nullable(),
  entities: z.record(z.string(), z.unknown()).nullable(),
  tags: z.array(z.string()).nullable(),
  summary: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number().int(),
  processed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

export type BatchStatus = z.infer<typeof batchStatusEnum>;
export type ItemStatus = z.infer<typeof itemStatusEnum>;
export type InputType = z.infer<typeof inputTypeEnum>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type Batch = z.infer<typeof batchSchema>;
export type BatchItem = z.infer<typeof batchItemSchema>;
