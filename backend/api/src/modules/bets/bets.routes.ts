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
  isValidBetCents,
  normalizeBetDate,
  normalizeBetOdds,
  normalizeBetText,
  normalizeOptionalBetText,
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
      event,
      selection,
      market,
      sportsbook,
      stakeCents,
      decimalOdds,
      placedAt,
    } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedEvent = normalizeBetText(event, 160);
    const normalizedSelection = normalizeBetText(selection, 120);
    const normalizedMarket = normalizeOptionalBetText(market, 100);
    const normalizedSportsbook = normalizeOptionalBetText(sportsbook, 80);
    const normalizedOdds = normalizeBetOdds(decimalOdds);
    const normalizedPlacedAt = normalizeBetDate(placedAt);
    const hasMarket = market !== null && market !== undefined && market !== "";
    const hasSportsbook =
      sportsbook !== null && sportsbook !== undefined && sportsbook !== "";

    if (
      !normalizedEvent ||
      !normalizedSelection ||
      (hasMarket && !normalizedMarket) ||
      (hasSportsbook && !normalizedSportsbook) ||
      !isValidBetCents(stakeCents) ||
      !normalizedOdds ||
      !normalizedPlacedAt
    ) {
      response.status(400).json({
        error: "Revisa el evento, selección, monto, cuota y fecha.",
      });
      return;
    }

    const bet = await createBet({
      userId: request.authUser!.id,
      event: normalizedEvent,
      selection: normalizedSelection,
      market: normalizedMarket,
      sportsbook: normalizedSportsbook,
      stakeCents,
      decimalOdds: normalizedOdds,
      placedAt: normalizedPlacedAt,
    });
    if (!bet) {
      response.status(409).json({
        error: "Esta apuesta supera tu límite mensual disponible.",
      });
      return;
    }

    response.status(201).json({ bet });
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
    const { bankrollCents, monthlyLimitCents } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    if (
      !isValidBetCents(bankrollCents, { allowZero: true }) ||
      !isValidBetCents(monthlyLimitCents, { allowZero: true })
    ) {
      response.status(400).json({
        error: "El bankroll y el límite mensual deben ser montos válidos.",
      });
      return;
    }

    const settings = await updateBetSettings({
      userId: request.authUser!.id,
      bankrollCents,
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
