import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type { BetStatus } from "./bets.validation.js";

export type NexoBet = {
  id: string;
  event: string;
  selection: string;
  market: string | null;
  sportsbook: string | null;
  stakeCents: number;
  decimalOdds: number;
  status: BetStatus;
  placedAt: string;
  settledAt: string | null;
  createdAt: string;
};

export type BetSettings = {
  bankrollCents: number;
  monthlyLimitCents: number;
};

export type BetSummary = {
  bankrollCents: number;
  currentBankrollCents: number;
  monthlyLimitCents: number;
  monthlyStakedCents: number;
  remainingLimitCents: number;
  pendingStakeCents: number;
  potentialPayoutCents: number;
  settledProfitCents: number;
};

type BetRow = {
  id: string;
  event: string;
  selection: string;
  market: string | null;
  sportsbook: string | null;
  stake_cents: string;
  decimal_odds: string;
  status: BetStatus;
  placed_at: Date;
  settled_at: Date | null;
  created_at: Date;
};

type SettingsRow = {
  bankroll_cents: string;
  monthly_limit_cents: string;
};

type SummaryRow = {
  monthly_staked_cents: string;
  pending_stake_cents: string;
  potential_payout_cents: string;
  settled_profit_cents: string;
};

function mapBet(row: BetRow): NexoBet {
  return {
    id: row.id,
    event: row.event,
    selection: row.selection,
    market: row.market,
    sportsbook: row.sportsbook,
    stakeCents: Number(row.stake_cents),
    decimalOdds: Number(row.decimal_odds),
    status: row.status,
    placedAt: row.placed_at.toISOString(),
    settledAt: row.settled_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function getBets(userId: string): Promise<{
  bets: NexoBet[];
  settings: BetSettings;
  summary: BetSummary;
}> {
  const [betsResult, settingsResult, summaryResult] = await Promise.all([
    query<BetRow>(
      `SELECT
         id,
         event,
         selection,
         market,
         sportsbook,
         stake_cents,
         decimal_odds,
         status,
         placed_at,
         settled_at,
         created_at
       FROM nexo_bets
       WHERE nexo_user_id = $1
       ORDER BY
         (status = 'pending') DESC,
         placed_at DESC,
         created_at DESC
       LIMIT 500`,
      [userId],
    ),
    query<SettingsRow>(
      `SELECT bankroll_cents, monthly_limit_cents
       FROM nexo_bet_settings
       WHERE nexo_user_id = $1`,
      [userId],
    ),
    query<SummaryRow>(
      `SELECT
         COALESCE(
           SUM(stake_cents) FILTER (
             WHERE placed_at >= DATE_TRUNC('month', NOW())
           ),
           0
         ) AS monthly_staked_cents,
         COALESCE(
           SUM(stake_cents) FILTER (WHERE status = 'pending'),
           0
         ) AS pending_stake_cents,
         COALESCE(
           SUM(ROUND(stake_cents * decimal_odds)) FILTER (
             WHERE status = 'pending'
           ),
           0
         ) AS potential_payout_cents,
         COALESCE(
           SUM(
             CASE
               WHEN status = 'won'
                 THEN ROUND(stake_cents * decimal_odds) - stake_cents
               WHEN status = 'lost' THEN -stake_cents
               ELSE 0
             END
           ),
           0
         ) AS settled_profit_cents
       FROM nexo_bets
       WHERE nexo_user_id = $1`,
      [userId],
    ),
  ]);

  const settingsRow = settingsResult.rows[0];
  const summaryRow = summaryResult.rows[0]!;
  const bankrollCents = Number(settingsRow?.bankroll_cents ?? 0);
  const monthlyLimitCents = Number(settingsRow?.monthly_limit_cents ?? 0);
  const monthlyStakedCents = Number(summaryRow.monthly_staked_cents);
  const settledProfitCents = Number(summaryRow.settled_profit_cents);

  return {
    bets: betsResult.rows.map(mapBet),
    settings: {
      bankrollCents,
      monthlyLimitCents,
    },
    summary: {
      bankrollCents,
      currentBankrollCents: bankrollCents + settledProfitCents,
      monthlyLimitCents,
      monthlyStakedCents,
      remainingLimitCents: Math.max(monthlyLimitCents - monthlyStakedCents, 0),
      pendingStakeCents: Number(summaryRow.pending_stake_cents),
      potentialPayoutCents: Number(summaryRow.potential_payout_cents),
      settledProfitCents,
    },
  };
}

export async function createBet(input: {
  userId: string;
  event: string;
  selection: string;
  market: string | null;
  sportsbook: string | null;
  stakeCents: number;
  decimalOdds: number;
  placedAt: string;
}): Promise<NexoBet | null> {
  const result = await query<BetRow>(
    `INSERT INTO nexo_bets (
       id,
       nexo_user_id,
       event,
       selection,
       market,
       sportsbook,
       stake_cents,
       decimal_odds,
       status,
       placed_at,
       settled_at,
       created_at
     )
     SELECT
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       'pending',
       $9,
       NULL,
       NOW()
     WHERE
       DATE_TRUNC('month', $9::TIMESTAMPTZ) <> DATE_TRUNC('month', NOW())
       OR COALESCE(
         (
           SELECT monthly_limit_cents
           FROM nexo_bet_settings
           WHERE nexo_user_id = $2
         ),
         0
       ) = 0
       OR (
         COALESCE(
           (
             SELECT SUM(stake_cents)
             FROM nexo_bets
             WHERE nexo_user_id = $2
               AND placed_at >= DATE_TRUNC('month', NOW())
               AND placed_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
           ),
           0
         ) + $7
       ) <= (
         SELECT monthly_limit_cents
         FROM nexo_bet_settings
         WHERE nexo_user_id = $2
       )
     RETURNING
       id,
       event,
       selection,
       market,
       sportsbook,
       stake_cents,
       decimal_odds,
       status,
       placed_at,
       settled_at,
       created_at`,
    [
      randomUUID(),
      input.userId,
      input.event,
      input.selection,
      input.market,
      input.sportsbook,
      input.stakeCents,
      input.decimalOdds,
      input.placedAt,
    ],
  );

  return result.rows[0] ? mapBet(result.rows[0]) : null;
}

export async function updateBetStatus(input: {
  id: string;
  userId: string;
  status: BetStatus;
}): Promise<NexoBet | null> {
  const result = await query<BetRow>(
    `UPDATE nexo_bets
     SET
       status = $3,
       settled_at = CASE WHEN $3 = 'pending' THEN NULL ELSE NOW() END
     WHERE id = $1 AND nexo_user_id = $2
     RETURNING
       id,
       event,
       selection,
       market,
       sportsbook,
       stake_cents,
       decimal_odds,
       status,
       placed_at,
       settled_at,
       created_at`,
    [input.id, input.userId, input.status],
  );

  return result.rows[0] ? mapBet(result.rows[0]) : null;
}

export async function updateBetSettings(input: {
  userId: string;
  bankrollCents: number;
  monthlyLimitCents: number;
}): Promise<BetSettings> {
  const result = await query<SettingsRow>(
    `INSERT INTO nexo_bet_settings (
       nexo_user_id,
       bankroll_cents,
       monthly_limit_cents,
       updated_at
     ) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (nexo_user_id)
     DO UPDATE SET
       bankroll_cents = EXCLUDED.bankroll_cents,
       monthly_limit_cents = EXCLUDED.monthly_limit_cents,
       updated_at = NOW()
     RETURNING bankroll_cents, monthly_limit_cents`,
    [input.userId, input.bankrollCents, input.monthlyLimitCents],
  );

  return {
    bankrollCents: Number(result.rows[0]!.bankroll_cents),
    monthlyLimitCents: Number(result.rows[0]!.monthly_limit_cents),
  };
}

export async function deleteBet(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    "DELETE FROM nexo_bets WHERE id = $1 AND nexo_user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
