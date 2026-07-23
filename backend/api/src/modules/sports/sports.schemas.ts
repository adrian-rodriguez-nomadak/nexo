import { z } from "zod";

export const matchParamsSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const ticketExtractionSchema = z.object({
  image_data_url: z.string().startsWith("data:image/").max(9_000_000),
});

export const betSelectionSchema = z.object({
  match: z.string().trim().min(1).max(180),
  market: z.string().trim().min(1).max(120),
  selection: z.string().trim().min(1).max(160),
  odds: z.coerce.number().gt(1).max(1000),
  estimatedProbability: z.coerce.number().min(1).max(99).optional(),
});

export const betAnalysisSchema = z
  .object({
    bookmaker: z.string().trim().max(120).optional(),
    stake: z.coerce.number().positive().max(10_000_000),
    bankroll: z.coerce.number().positive().max(100_000_000),
    totalOdds: z.coerce.number().gt(1).max(100_000),
    betType: z.enum(["single", "parlay"]),
    recommendationProfile: z
      .enum(["very_conservative", "conservative", "balanced"])
      .optional(),
    maxSuggestedOdds: z.coerce.number().min(1.2).max(20).optional(),
    confirmed: z.literal(true),
    selections: z.array(betSelectionSchema).min(1).max(20),
  })
  .superRefine((ticket, context) => {
    if (ticket.stake > ticket.bankroll) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stake"],
        message: "El monto no puede superar el bankroll.",
      });
    }
    if (ticket.betType === "single" && ticket.selections.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selections"],
        message: "Una apuesta individual debe contener una selección.",
      });
    }
  });

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
