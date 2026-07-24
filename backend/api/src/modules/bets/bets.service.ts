import { randomUUID } from "node:crypto";

import { pool, query } from "../../shared/db/database.js";
import {
  betPayoutCents,
  type NormalizedBetSelection,
  type BetStatus,
  type Sportsbook,
} from "./bets.validation.js";

export type BetSelection = NormalizedBetSelection & {
  id: string;
};

export type NexoBet = {
  id: string;
  event: string;
  selection: string;
  market: string | null;
  sportsbook: string | null;
  selections: BetSelection[];
  financeAccountId: string | null;
  financeAccountName: string | null;
  financeSynced: boolean;
  stakeCents: number;
  decimalOdds: number;
  status: BetStatus;
  placedAt: string;
  settledAt: string | null;
  createdAt: string;
};

export type BetSettings = {
  monthlyLimitCents: number;
};

export type BetFinanceAccount = {
  id: string;
  name: string;
  balanceCents: number;
};

export type BetSummary = {
  financeBalanceCents: number;
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
  finance_account_id: string | null;
  finance_account_name: string | null;
  stake_transaction_id: string | null;
  settlement_transaction_id: string | null;
  stake_cents: string;
  decimal_odds: string;
  status: BetStatus;
  placed_at: Date;
  settled_at: Date | null;
  created_at: Date;
};

type SettingsRow = {
  monthly_limit_cents: string;
};

type SummaryRow = {
  monthly_staked_cents: string;
  pending_stake_cents: string;
  potential_payout_cents: string;
  settled_profit_cents: string;
};

type FinanceAccountRow = {
  id: string;
  name: string;
  initial_balance_cents: string;
  movement_balance_cents: string;
};

type SelectionRow = {
  id: string;
  bet_id: string;
  event: string;
  selection: string;
  market: string | null;
  decimal_odds: string | null;
};

function mapBet(
  row: BetRow,
  selections: BetSelection[] = [],
): NexoBet {
  return {
    id: row.id,
    event: row.event,
    selection: row.selection,
    market: row.market,
    sportsbook: row.sportsbook,
    selections:
      selections.length > 0
        ? selections
        : [
            {
              id: `legacy-${row.id}`,
              event: row.event,
              selection: row.selection,
              market: row.market,
              decimalOdds: Number(row.decimal_odds),
            },
          ],
    financeAccountId: row.finance_account_id,
    financeAccountName: row.finance_account_name,
    financeSynced:
      row.finance_account_id !== null &&
      row.stake_transaction_id !== null,
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
  financeAccounts: BetFinanceAccount[];
  settings: BetSettings;
  summary: BetSummary;
}> {
  const [betsResult, accountsResult, settingsResult, summaryResult] =
    await Promise.all([
      query<BetRow>(
        `SELECT
           b.id,
           b.event,
           b.selection,
           b.market,
           b.sportsbook,
           b.finance_account_id,
           a.name AS finance_account_name,
           b.stake_transaction_id,
           b.settlement_transaction_id,
           b.stake_cents,
           b.decimal_odds,
           b.status,
           b.placed_at,
           b.settled_at,
           b.created_at
         FROM nexo_bets b
         LEFT JOIN finance_accounts a ON a.id = b.finance_account_id
         WHERE b.nexo_user_id = $1
         ORDER BY
           (b.status = 'pending') DESC,
           b.placed_at DESC,
           b.created_at DESC
         LIMIT 500`,
        [userId],
      ),
      query<FinanceAccountRow>(
        `SELECT
           a.id,
           a.name,
           a.initial_balance_cents,
           COALESCE(
             SUM(
               CASE
                 WHEN t.kind = 'income' THEN t.amount_cents
                 WHEN t.kind = 'expense' THEN -t.amount_cents
                 ELSE 0
               END
             ),
             0
           ) AS movement_balance_cents
         FROM finance_accounts a
         LEFT JOIN finance_transactions t ON t.account_id = a.id
         WHERE a.nexo_user_id = $1
         GROUP BY a.id
         ORDER BY a.created_at ASC`,
        [userId],
      ),
      query<SettingsRow>(
        `SELECT monthly_limit_cents
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
  const selectionsResult = await query<SelectionRow>(
    `SELECT
       s.id,
       s.bet_id,
       s.event,
       s.selection,
       s.market,
       s.decimal_odds
     FROM nexo_bet_selections s
     INNER JOIN nexo_bets b ON b.id = s.bet_id
     WHERE b.nexo_user_id = $1
     ORDER BY s.bet_id, s.position`,
    [userId],
  );
  const selectionsByBet = new Map<string, BetSelection[]>();
  for (const row of selectionsResult.rows) {
    const selection: BetSelection = {
      id: row.id,
      event: row.event,
      selection: row.selection,
      market: row.market,
      decimalOdds:
        row.decimal_odds === null ? null : Number(row.decimal_odds),
    };
    const current = selectionsByBet.get(row.bet_id) ?? [];
    current.push(selection);
    selectionsByBet.set(row.bet_id, current);
  }

  const settingsRow = settingsResult.rows[0];
  const summaryRow = summaryResult.rows[0]!;
  const monthlyLimitCents = Number(settingsRow?.monthly_limit_cents ?? 0);
  const monthlyStakedCents = Number(summaryRow.monthly_staked_cents);
  const settledProfitCents = Number(summaryRow.settled_profit_cents);
  const financeAccounts = accountsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    balanceCents:
      Number(row.initial_balance_cents) +
      Number(row.movement_balance_cents),
  }));

  return {
    bets: betsResult.rows.map((row) =>
      mapBet(row, selectionsByBet.get(row.id)),
    ),
    financeAccounts,
    settings: {
      monthlyLimitCents,
    },
    summary: {
      financeBalanceCents: financeAccounts.reduce(
        (total, account) => total + account.balanceCents,
        0,
      ),
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
  selections: NormalizedBetSelection[];
  sportsbook: Sportsbook;
  financeAccountId: string;
  stakeCents: number;
  decimalOdds: number;
  placedAt: string;
}): Promise<
  | { bet: NexoBet; error: null }
  | { bet: null; error: "account_not_found" | "limit_exceeded" }
> {
  const client = await pool.connect();
  const betId = randomUUID();
  const stakeTransactionId = randomUUID();
  const firstSelection = input.selections[0]!;

  try {
    await client.query("BEGIN");

    const accountResult = await client.query<{ name: string }>(
      `SELECT name
       FROM finance_accounts
       WHERE id = $1 AND nexo_user_id = $2
       FOR UPDATE`,
      [input.financeAccountId, input.userId],
    );
    const financeAccountName = accountResult.rows[0]?.name ?? null;
    if (!financeAccountName) {
      await client.query("ROLLBACK");
      return { bet: null, error: "account_not_found" };
    }

    await client.query(
      `INSERT INTO finance_transactions (
         id,
         account_id,
         kind,
         category,
         description,
         amount_cents,
         occurred_at,
         created_at
       ) VALUES ($1, $2, 'expense', 'Apuestas', $3, $4, $5, NOW())`,
      [
        stakeTransactionId,
        input.financeAccountId,
        `Apuesta combinada: ${input.selections.length} selecciones · ${input.sportsbook}`,
        input.stakeCents,
        input.placedAt,
      ],
    );

    const result = await client.query<BetRow>(
      `INSERT INTO nexo_bets (
         id,
         nexo_user_id,
         event,
         selection,
         market,
         sportsbook,
         finance_account_id,
         stake_transaction_id,
         settlement_transaction_id,
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
         NULL,
         $9::BIGINT,
         $10::NUMERIC,
         'pending',
         $11::TIMESTAMPTZ,
         NULL,
         NOW()
       WHERE
         DATE_TRUNC('month', $11::TIMESTAMPTZ) <> DATE_TRUNC('month', NOW())
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
                 AND placed_at <
                   DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
             ),
             0
           ) + $9::BIGINT
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
         finance_account_id,
         $12::TEXT AS finance_account_name,
         stake_transaction_id,
         settlement_transaction_id,
         stake_cents,
         decimal_odds,
         status,
         placed_at,
         settled_at,
         created_at`,
      [
        betId,
        input.userId,
        firstSelection.event,
        firstSelection.selection,
        firstSelection.market,
        input.sportsbook,
        input.financeAccountId,
        stakeTransactionId,
        input.stakeCents,
        input.decimalOdds,
        input.placedAt,
        financeAccountName,
      ],
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return { bet: null, error: "limit_exceeded" };
    }

    const savedSelections: BetSelection[] = [];
    for (const [position, selection] of input.selections.entries()) {
      const selectionId = randomUUID();
      await client.query(
        `INSERT INTO nexo_bet_selections (
           id,
           bet_id,
           event,
           selection,
           market,
           decimal_odds,
           position,
           created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          selectionId,
          betId,
          selection.event,
          selection.selection,
          selection.market,
          selection.decimalOdds,
          position,
        ],
      );
      savedSelections.push({ id: selectionId, ...selection });
    }

    await client.query("COMMIT");
    return {
      bet: mapBet(result.rows[0], savedSelections),
      error: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBetStatus(input: {
  id: string;
  userId: string;
  status: BetStatus;
}): Promise<NexoBet | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const currentResult = await client.query<BetRow>(
      `SELECT
         b.id,
         b.event,
         b.selection,
         b.market,
         b.sportsbook,
         b.finance_account_id,
         a.name AS finance_account_name,
         b.stake_transaction_id,
         b.settlement_transaction_id,
         b.stake_cents,
         b.decimal_odds,
         b.status,
         b.placed_at,
         b.settled_at,
         b.created_at
       FROM nexo_bets b
       LEFT JOIN finance_accounts a ON a.id = b.finance_account_id
       WHERE b.id = $1 AND b.nexo_user_id = $2
       FOR UPDATE OF b`,
      [input.id, input.userId],
    );
    const currentBet = currentResult.rows[0];
    if (!currentBet) {
      await client.query("ROLLBACK");
      return null;
    }

    if (currentBet.settlement_transaction_id) {
      await client.query(
        "DELETE FROM finance_transactions WHERE id = $1",
        [currentBet.settlement_transaction_id],
      );
    }

    let settlementTransactionId: string | null = null;
    const financeSynced =
      currentBet.finance_account_id !== null &&
      currentBet.stake_transaction_id !== null;
    if (
      financeSynced &&
      (input.status === "won" || input.status === "void")
    ) {
      settlementTransactionId = randomUUID();
      const payoutCents = betPayoutCents(
        Number(currentBet.stake_cents),
        Number(currentBet.decimal_odds),
        input.status,
      )!;
      const description =
        input.status === "won"
          ? `Cobro de apuesta combinada · ${currentBet.sportsbook ?? "Otro"}`
          : `Devolución de apuesta combinada · ${currentBet.sportsbook ?? "Otro"}`;

      await client.query(
        `INSERT INTO finance_transactions (
           id,
           account_id,
           kind,
           category,
           description,
           amount_cents,
           occurred_at,
           created_at
         ) VALUES ($1, $2, 'income', 'Apuestas', $3, $4, NOW(), NOW())`,
        [
          settlementTransactionId,
          currentBet.finance_account_id,
          description,
          payoutCents,
        ],
      );
    }

    const result = await client.query<BetRow>(
      `UPDATE nexo_bets
       SET
         status = $3,
         settled_at = CASE WHEN $3 = 'pending' THEN NULL ELSE NOW() END,
         settlement_transaction_id = $4
       WHERE id = $1 AND nexo_user_id = $2
       RETURNING
         id,
         event,
         selection,
         market,
         sportsbook,
         finance_account_id,
         $5::TEXT AS finance_account_name,
         stake_transaction_id,
         settlement_transaction_id,
         stake_cents,
         decimal_odds,
         status,
         placed_at,
         settled_at,
         created_at`,
      [
        input.id,
        input.userId,
        input.status,
        settlementTransactionId,
        currentBet.finance_account_name,
      ],
    );

    await client.query("COMMIT");
    return mapBet(result.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBetSettings(input: {
  userId: string;
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
       monthly_limit_cents = EXCLUDED.monthly_limit_cents,
       updated_at = NOW()
     RETURNING monthly_limit_cents`,
    [input.userId, 0, input.monthlyLimitCents],
  );

  return {
    monthlyLimitCents: Number(result.rows[0]!.monthly_limit_cents),
  };
}

export async function deleteBet(
  userId: string,
  id: string,
): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const betResult = await client.query<{
      stake_transaction_id: string | null;
      settlement_transaction_id: string | null;
    }>(
      `SELECT stake_transaction_id, settlement_transaction_id
       FROM nexo_bets
       WHERE id = $1 AND nexo_user_id = $2
       FOR UPDATE`,
      [id, userId],
    );
    const bet = betResult.rows[0];
    if (!bet) {
      await client.query("ROLLBACK");
      return false;
    }

    const transactionIds = [
      bet.stake_transaction_id,
      bet.settlement_transaction_id,
    ].filter((value): value is string => value !== null);
    if (transactionIds.length > 0) {
      await client.query(
        "DELETE FROM finance_transactions WHERE id = ANY($1::TEXT[])",
        [transactionIds],
      );
    }
    await client.query(
      "DELETE FROM nexo_bets WHERE id = $1 AND nexo_user_id = $2",
      [id, userId],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
