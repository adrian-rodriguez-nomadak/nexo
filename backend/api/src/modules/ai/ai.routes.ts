import { Router } from "express";

import { aiController } from "./ai.controller.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { rateLimit } from "../../shared/middlewares/rate-limit.middleware.js";

export const aiRoutes = Router();
export const publicAiRoutes = Router();

aiRoutes.get("/", aiController.health);
aiRoutes.get("/health", aiController.health);
aiRoutes.post(
  "/memory/analyze",
  rateLimit({ windowMs: 60_000, max: 12 }),
  asyncHandler(aiController.analyzeMemory),
);

publicAiRoutes.post(
  "/memory/analyze",
  rateLimit({ windowMs: 60_000, max: 6 }),
  asyncHandler(aiController.analyzeMemoryPublic),
);
