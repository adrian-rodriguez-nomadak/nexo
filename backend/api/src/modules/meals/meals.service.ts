import { randomUUID } from "node:crypto";

import { pool, query } from "../../shared/db/database.js";
import type { MealType } from "./meals.validation.js";

export type NexoMeal = {
  id: string;
  name: string;
  type: MealType;
  notes: string | null;
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  costCents: number;
  financeAccountId: string | null;
  financeAccountName: string | null;
  financeSynced: boolean;
  eatenAt: string;
  createdAt: string;
};

export type MealFinanceAccount = {
  id: string;
  name: string;
  balanceCents: number;
};

type MealRow = {
  id: string;
  name: string;
  meal_type: MealType;
  notes: string | null;
  calories: number | null;
  protein_grams: string | null;
  carbs_grams: string | null;
  fat_grams: string | null;
  cost_cents: string;
  finance_account_id: string | null;
  finance_account_name: string | null;
  finance_transaction_id: string | null;
  eaten_at: Date;
  created_at: Date;
};

type FinanceAccountRow = {
  id: string;
  name: string;
  initial_balance_cents: string;
  movement_balance_cents: string;
};

function mapMeal(row: MealRow): NexoMeal {
  return {
    id: row.id,
    name: row.name,
    type: row.meal_type,
    notes: row.notes,
    calories: row.calories,
    proteinGrams:
      row.protein_grams === null ? null : Number(row.protein_grams),
    carbsGrams: row.carbs_grams === null ? null : Number(row.carbs_grams),
    fatGrams: row.fat_grams === null ? null : Number(row.fat_grams),
    costCents: Number(row.cost_cents),
    financeAccountId: row.finance_account_id,
    financeAccountName: row.finance_account_name,
    financeSynced:
      row.cost_cents !== "0" && row.finance_transaction_id !== null,
    eatenAt: row.eaten_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export async function getMeals(userId: string): Promise<{
  meals: NexoMeal[];
  financeAccounts: MealFinanceAccount[];
}> {
  const [mealsResult, accountsResult] = await Promise.all([
    query<MealRow>(
      `SELECT
         m.id,
         m.name,
         m.meal_type,
         m.notes,
         m.calories,
         m.protein_grams,
         m.carbs_grams,
         m.fat_grams,
         m.cost_cents,
         m.finance_account_id,
         a.name AS finance_account_name,
         m.finance_transaction_id,
         m.eaten_at,
         m.created_at
       FROM nexo_meals m
       LEFT JOIN finance_accounts a ON a.id = m.finance_account_id
       WHERE m.nexo_user_id = $1
       ORDER BY m.eaten_at DESC, m.created_at DESC
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
  ]);

  return {
    meals: mealsResult.rows.map(mapMeal),
    financeAccounts: accountsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      balanceCents:
        Number(row.initial_balance_cents) +
        Number(row.movement_balance_cents),
    })),
  };
}

export async function createMeal(input: {
  userId: string;
  name: string;
  type: MealType;
  notes: string | null;
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  costCents: number;
  financeAccountId: string | null;
  eatenAt: string;
}): Promise<
  | { meal: NexoMeal; error: null }
  | { meal: null; error: "account_required" | "account_not_found" }
> {
  if (input.costCents > 0 && !input.financeAccountId) {
    return { meal: null, error: "account_required" };
  }

  const client = await pool.connect();
  const mealId = randomUUID();
  const financeTransactionId =
    input.costCents > 0 ? randomUUID() : null;

  try {
    await client.query("BEGIN");

    let financeAccountName: string | null = null;
    if (input.financeAccountId) {
      const accountResult = await client.query<{ name: string }>(
        `SELECT name
         FROM finance_accounts
         WHERE id = $1 AND nexo_user_id = $2
         FOR UPDATE`,
        [input.financeAccountId, input.userId],
      );
      financeAccountName = accountResult.rows[0]?.name ?? null;
      if (!financeAccountName) {
        await client.query("ROLLBACK");
        return { meal: null, error: "account_not_found" };
      }
    }

    if (
      financeTransactionId &&
      input.financeAccountId &&
      input.costCents > 0
    ) {
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
         ) VALUES ($1, $2, 'expense', 'Comidas', $3, $4::BIGINT, $5::TIMESTAMPTZ, NOW())`,
        [
          financeTransactionId,
          input.financeAccountId,
          input.name,
          input.costCents,
          input.eatenAt,
        ],
      );
    }

    const result = await client.query<MealRow>(
      `INSERT INTO nexo_meals (
         id,
         nexo_user_id,
         name,
         meal_type,
         notes,
         calories,
         protein_grams,
         carbs_grams,
         fat_grams,
         cost_cents,
         finance_account_id,
         finance_transaction_id,
         eaten_at,
         created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6::INTEGER, $7::NUMERIC, $8::NUMERIC,
         $9::NUMERIC, $10::BIGINT, $11, $12, $13::TIMESTAMPTZ, NOW()
       )
       RETURNING
         id,
         name,
         meal_type,
         notes,
         calories,
         protein_grams,
         carbs_grams,
         fat_grams,
         cost_cents,
         finance_account_id,
         $14::TEXT AS finance_account_name,
         finance_transaction_id,
         eaten_at,
         created_at`,
      [
        mealId,
        input.userId,
        input.name,
        input.type,
        input.notes,
        input.calories,
        input.proteinGrams,
        input.carbsGrams,
        input.fatGrams,
        input.costCents,
        input.financeAccountId,
        financeTransactionId,
        input.eatenAt,
        financeAccountName,
      ],
    );

    await client.query("COMMIT");
    return { meal: mapMeal(result.rows[0]!), error: null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMeal(
  userId: string,
  id: string,
): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{ finance_transaction_id: string | null }>(
      `DELETE FROM nexo_meals
       WHERE id = $1 AND nexo_user_id = $2
       RETURNING finance_transaction_id`,
      [id, userId],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return false;
    }

    if (row.finance_transaction_id) {
      await client.query(
        "DELETE FROM finance_transactions WHERE id = $1",
        [row.finance_transaction_id],
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

