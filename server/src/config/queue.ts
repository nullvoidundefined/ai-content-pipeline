import { Queue } from "bullmq";

import { logger } from "app/utils/logs/logger.js";

let contentProcessQueue: Queue | null = null;

export function getContentProcessQueue(): Queue | null {
  if (contentProcessQueue) return contentProcessQueue;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn("REDIS_URL not set — cannot create content-process queue");
    return null;
  }

  contentProcessQueue = new Queue("content-process", {
    connection: { url },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  return contentProcessQueue;
}

export async function shutdownQueues(): Promise<void> {
  if (contentProcessQueue) {
    await contentProcessQueue.close();
    contentProcessQueue = null;
  }
}
