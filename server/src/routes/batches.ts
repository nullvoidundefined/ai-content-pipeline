import express from "express";

import * as batchHandlers from "app/handlers/batches/batches.js";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";

const batchesRouter = express.Router();

batchesRouter.use(requireAuth);
batchesRouter.get("/", batchHandlers.listBatches);
batchesRouter.post("/", batchHandlers.createBatch);
batchesRouter.get("/:id", batchHandlers.getBatch);
batchesRouter.get("/:id/items", batchHandlers.getBatchItems);

export { batchesRouter };
