import { Worker } from "bullmq";

import pool from "app/db/pool/pool.js";
import { processItem } from "app/processors/content-processor.js";
import { logger } from "app/utils/logs/logger.js";

const worker = new Worker("content-process", processItem, {
  connection: { url: process.env.REDIS_URL },
  concurrency: 3,
  limiter: {
    max: 10,
    duration: 60_000,
  },
});

worker.on("ready", () => {
  logger.info("Worker ready and listening for jobs");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, itemId: job.data.itemId }, "Job completed");
});

worker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, itemId: job?.data?.itemId, err },
    "Job failed",
  );
});

worker.on("error", (err) => {
  logger.error({ err }, "Worker error");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker shutting down gracefully");
  await worker.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception in worker – shutting down");
  logger.flush();
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection in worker – shutting down");
  logger.flush();
  process.exit(1);
});

logger.info("Content processing worker started");
