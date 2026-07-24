import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  analyzeBetImage,
  isValidBetImageDataUrl,
} from "./bets.image.js";
import {
  createBet,
  deleteBet,
  getBets,
  updateBetSettings,
  updateBetStatus,
} from "./bets.service.js";
import {
  isBetStatus,
  isSportsbook,
  isValidBetCents,
  normalizeBetDate,
  normalizeBetSelections,
  resolveBetOdds,
} from "./bets.validation.js";

export const betsRouter = Router();

betsRouter.post(
  "/extract-image",
  asyncHandler(async (request, response) => {
    const { imageDataUrl } = (request.body ?? {}) as Record<string, unknown>;
    if (!isValidBetImageDataUrl(imageDataUrl)) {
      response.status(400).json({
        error: "Sube una imagen PNG, JPG o WEBP de máximo 5 MB.",
      });
      return;
    }

    try {
      const extracted = await analyzeBetImage(imageDataUrl);
      response.json({ extracted });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "OPENAI_API_KEY_NOT_CONFIGURED"
      ) {
        response.status(503).json({
          error: "La lectura de imágenes todavía no está configurada.",
        });
        return;
      }
      throw error;
    }
  }),
);

betsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json(await getBets(request.authUser!.id));
  }),
);

betsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const {
      selections,
      sportsbook,
      financeAccountId,
      stakeCents,
      decimalOdds,
      placedAt,
    } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedSelections = normalizeBetSelections(selections);
    const normalizedFinanceAccountId =
      typeof financeAccountId === "string" &&
      financeAccountId.length > 0 &&
      financeAccountId.length <= 100
        ? financeAccountId
        : null;
    const normalizedPlacedAt = normalizeBetDate(placedAt);
    const normalizedOdds = normalizedSelections
      ? resolveBetOdds(normalizedSelections, decimalOdds)
      : null;

    if (
      !normalizedSelections ||
      !isSportsbook(sportsbook) ||
      !normalizedFinanceAccountId ||
      !isValidBetCents(stakeCents) ||
      !normalizedOdds ||
      !normalizedPlacedAt
    ) {
      response.status(400).json({
        error:
          "Elige una cuenta y completa al menos una selección válida.",
      });
      return;
    }

    const result = await createBet({
      userId: request.authUser!.id,
      selections: normalizedSelections,
      sportsbook,
      financeAccountId: normalizedFinanceAccountId,
      stakeCents,
      decimalOdds: normalizedOdds,
      placedAt: normalizedPlacedAt,
    });
    if (result.error === "account_not_found") {
      response.status(404).json({
        error: "La cuenta de Finanzas seleccionada no existe.",
      });
      return;
    }
    if (result.error === "limit_exceeded") {
      response.status(409).json({
        error: "Esta apuesta supera tu límite mensual disponible.",
      });
      return;
    }

    response.status(201).json({ bet: result.bet });
  }),
);

betsRouter.patch(
  "/:id/status",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    const { status } = (request.body ?? {}) as Record<string, unknown>;

    if (!id || id.length > 100 || !isBetStatus(status)) {
      response.status(400).json({ error: "El resultado no es válido." });
      return;
    }

    const bet = await updateBetStatus({
      id,
      userId: request.authUser!.id,
      status,
    });
    if (!bet) {
      response.status(404).json({ error: "La apuesta ya no existe." });
      return;
    }

    response.json({ bet });
  }),
);

betsRouter.put(
  "/settings",
  asyncHandler(async (request, response) => {
    const { monthlyLimitCents } = (request.body ?? {}) as Record<string, unknown>;
    if (!isValidBetCents(monthlyLimitCents, { allowZero: true })) {
      response.status(400).json({
        error: "El límite mensual debe ser un monto válido.",
      });
      return;
    }

    const settings = await updateBetSettings({
      userId: request.authUser!.id,
      monthlyLimitCents,
    });
    response.json({ settings });
  }),
);

betsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteBet(request.authUser!.id, id);
    if (!deleted) {
      response.status(404).json({ error: "La apuesta ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);
