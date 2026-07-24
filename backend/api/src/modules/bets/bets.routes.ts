import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
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
} from "./bets.validation.js";

export const betsRouter = Router();

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

    if (
      !normalizedSelections ||
      !isSportsbook(sportsbook) ||
      !normalizedFinanceAccountId ||
      !isValidBetCents(stakeCents) ||
      !normalizedPlacedAt
    ) {
      response.status(400).json({
        error:
          "Elige una cuenta y completa al menos dos selecciones válidas.",
      });
      return;
    }

    const result = await createBet({
      userId: request.authUser!.id,
      selections: normalizedSelections,
      sportsbook,
      financeAccountId: normalizedFinanceAccountId,
      stakeCents,
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
