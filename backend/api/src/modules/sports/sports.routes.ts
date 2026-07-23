import { Router } from "express";

import { rateLimit } from "../../shared/middlewares/rate-limit.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { sportsController } from "./sports.controller.js";
import {
  betAnalysisSchema,
  historyQuerySchema,
  matchParamsSchema,
  ticketExtractionSchema,
} from "./sports.schemas.js";

export const sportsRoutes = Router();

sportsRoutes.get("/health", sportsController.health);
sportsRoutes.get("/overview", asyncHandler(sportsController.overview));
sportsRoutes.get(
  "/history",
  validate({ query: historyQuerySchema }),
  asyncHandler(sportsController.history),
);
sportsRoutes.get(
  "/matches/:id",
  validate({ params: matchParamsSchema }),
  asyncHandler(sportsController.match),
);
sportsRoutes.post(
  "/matches/:id/analyze",
  rateLimit({ windowMs: 60_000, max: 20 }),
  validate({ params: matchParamsSchema }),
  asyncHandler(sportsController.analyzeMatch),
);
sportsRoutes.post(
  "/bets/extract",
  rateLimit({ windowMs: 60_000, max: 8 }),
  validate({ body: ticketExtractionSchema }),
  asyncHandler(sportsController.extractTicket),
);
sportsRoutes.post(
  "/bets/analyze",
  rateLimit({ windowMs: 60_000, max: 20 }),
  validate({ body: betAnalysisSchema }),
  asyncHandler(sportsController.analyzeBet),
);
