import { QueryTypes } from "sequelize";

import { requireUserId } from "../../shared/auth/user-context.js";
import { sequelize } from "../../shared/db/sequelize.js";
import type {
  BetRiskAnalysis,
  BetTicket,
  MatchAnalysis,
} from "./sports.types.js";

export const sportsRepository = {
  async saveMatchAnalysis(
    matchProviderKey: string,
    snapshot: unknown,
    result: MatchAnalysis,
  ) {
    const row = await sequelize.query<{ id: string; created_at: string }>(
      `INSERT INTO match_analyses
        (user_id, match_provider_key, input_snapshot, result, model_version)
       VALUES (:userId, :matchProviderKey, CAST(:snapshot AS jsonb), CAST(:result AS jsonb), :modelVersion)
       RETURNING id, created_at`,
      {
        replacements: {
          userId: requireUserId(),
          matchProviderKey,
          snapshot: JSON.stringify(snapshot),
          result: JSON.stringify(result),
          modelVersion: result.modelVersion,
        },
        type: QueryTypes.SELECT,
        plain: true,
      },
    );
    if (!row) throw new Error("No se pudo guardar el análisis del partido.");
    return row;
  },

  async saveBetAnalysis(ticket: BetTicket, result: BetRiskAnalysis) {
    const row = await sequelize.query<{ id: string; created_at: string }>(
      `INSERT INTO bet_analyses
        (user_id, bookmaker, stake, bankroll, total_odds, ticket, result)
       VALUES (:userId, :bookmaker, :stake, :bankroll, :totalOdds, CAST(:ticket AS jsonb), CAST(:result AS jsonb))
       RETURNING id, created_at`,
      {
        replacements: {
          userId: requireUserId(),
          bookmaker: ticket.bookmaker ?? null,
          stake: ticket.stake,
          bankroll: ticket.bankroll,
          totalOdds: ticket.totalOdds,
          ticket: JSON.stringify(ticket),
          result: JSON.stringify(result),
        },
        type: QueryTypes.SELECT,
        plain: true,
      },
    );
    if (!row) throw new Error("No se pudo guardar el análisis de riesgo.");
    return row;
  },

  async history(limit: number) {
    const [matches, bets] = await Promise.all([
      sequelize.query<Record<string, unknown>>(
        `SELECT id, match_provider_key, result, created_at
         FROM match_analyses
         WHERE user_id = :userId
         ORDER BY created_at DESC
         LIMIT :limit`,
        {
          replacements: { userId: requireUserId(), limit },
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<Record<string, unknown>>(
        `SELECT id, bookmaker, stake, bankroll, total_odds, ticket, result, status, created_at
         FROM bet_analyses
         WHERE user_id = :userId
         ORDER BY created_at DESC
         LIMIT :limit`,
        {
          replacements: { userId: requireUserId(), limit },
          type: QueryTypes.SELECT,
        },
      ),
    ]);
    return { matches, bets };
  },
};
