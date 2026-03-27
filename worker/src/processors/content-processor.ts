import Anthropic from "@anthropic-ai/sdk";
import type { Job } from "bullmq";

import { query } from "app/db/pool/pool.js";
import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from "app/prompts/tool-definitions.js";
import { fetchContent } from "app/services/content-fetcher.service.js";
import { logger } from "app/utils/logs/logger.js";

interface ProcessItemData {
  itemId: string;
  batchId: string;
  inputType: "url" | "text";
  inputUrl: string | null;
  inputText: string | null;
}

const anthropic = new Anthropic();

export async function processItem(job: Job<ProcessItemData>): Promise<void> {
  const { itemId, batchId, inputType, inputUrl, inputText } = job.data;

  logger.info({ itemId, batchId, inputType }, "Processing item");

  // Mark item as processing
  await query(
    `UPDATE batch_items SET status = 'processing' WHERE id = $1 AND status = 'queued'`,
    [itemId],
  );

  try {
    // Step 1: Get content
    let content: string;
    if (inputType === "url" && inputUrl) {
      content = await fetchContent(inputUrl);
    } else if (inputText) {
      content = inputText.slice(0, 8000);
    } else {
      throw new Error("No content available for processing");
    }

    if (content.length < 10) {
      throw new Error("Content too short to process");
    }

    // Step 2: Call Anthropic API with tool definitions
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages: [
        {
          role: "user",
          content: `Analyze the following content and use the summarize tool to generate a structured summary:\n\n${content}`,
        },
      ],
    });

    // Step 3: Process tool_use blocks
    let summary: string | null = null;
    let keyPoints: string[] | null = null;

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "summarize") {
        const input = block.input as { summary?: string; key_points?: string[] };
        summary = input.summary ?? null;
        keyPoints = input.key_points ?? null;
      }
    }

    if (!summary) {
      throw new Error("LLM did not return a summary tool call");
    }

    // Step 4: Store results
    await query(
      `UPDATE batch_items
       SET status = 'complete',
           summary = $1,
           tags = $2,
           attempts = attempts + 1,
           processed_at = NOW()
       WHERE id = $3`,
      [summary, keyPoints, itemId],
    );

    logger.info({ itemId, batchId }, "Item processed successfully");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, itemId, batchId }, "Failed to process item");

    await query(
      `UPDATE batch_items
       SET status = 'failed',
           error = $1,
           attempts = attempts + 1,
           processed_at = NOW()
       WHERE id = $2`,
      [errorMessage, itemId],
    );
  }

  // Update batch counts
  await query(
    `UPDATE batches SET
       completed_items = (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status = 'complete'),
       failed_items = (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status = 'failed'),
       status = CASE
         WHEN (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status IN ('queued', 'processing')) = 0
              AND (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1) > 0
         THEN CASE
           WHEN (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1 AND status = 'failed') =
                (SELECT COUNT(*) FROM batch_items WHERE batch_id = $1)
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
     WHERE id = $1`,
    [batchId],
  );
}
