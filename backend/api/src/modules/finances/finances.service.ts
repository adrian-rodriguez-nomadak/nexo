import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type {
  AccountType,
  TransactionKind,
} from "./finances.validation.js";

export type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  currency: "MXN";
  initialBalanceCents: number;
  balanceCents: number;
  createdAt: string;
};

export type FinanceTransaction = {
  id: string;
  transferId: string | null;
  accountId: string;
  accountName: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amountCents: number;
  occurredAt: string;
  createdAt: string;
};

export type FinanceSummary = {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  currency: "MXN";
  initial_balance_cents: string;
  movement_balance_cents: string;
  created_at: Date;
};

type TransactionRow = {
  id: string;
  transfer_id: string | null;
  account_id: string;
  account_name: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amount_cents: string;
  occurred_at: Date;
  created_at: Date;
};

type SummaryRow = {
  income_cents: string;
  expense_cents: string;
};

function mapAccount(row: AccountRow): FinanceAccount {
  const initialBalanceCents = Number(row.initial_balance_cents);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initialBalanceCents,
    balanceCents: initialBalanceCents + Number(row.movement_balance_cents),
    createdAt: row.created_at.toISOString(),
  };
}

function mapTransaction(row: TransactionRow): FinanceTransaction {
  return {
    id: row.id,
    transferId: row.transfer_id,
    accountId: row.account_id,
    accountName: row.account_name,
    kind: row.kind,
    category: row.category,
    description: row.description,
    amountCents: Number(row.amount_cents),
    occurredAt: row.occurred_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export async function getFinances(userId: string): Promise<{
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  summary: FinanceSummary;
}> {
  const [accountsResult, transactionsResult, summaryResult] = await Promise.all([
    query<AccountRow>(`
      SELECT
        a.id,
        a.name,
        a.type,
        a.currency,
        a.initial_balance_cents,
        a.created_at,
        COALESCE(SUM(
          CASE
            WHEN t.kind = 'income' THEN t.amount_cents
            WHEN t.kind = 'expense' THEN -t.amount_cents
            ELSE 0
          END
        ), 0) AS movement_balance_cents
      FROM finance_accounts a
      LEFT JOIN finance_transactions t ON t.account_id = a.id
      WHERE a.nexo_user_id = $1
      GROUP BY a.id
      ORDER BY a.created_at ASC
    `, [userId]),
    query<TransactionRow>(`
      SELECT
        t.id,
        t.transfer_id,
        t.account_id,
        a.name AS account_name,
        t.kind,
        t.category,
        t.description,
        t.amount_cents,
        t.occurred_at,
        t.created_at
      FROM finance_transactions t
      INNER JOIN finance_accounts a ON a.id = t.account_id
      WHERE a.nexo_user_id = $1
      ORDER BY t.occurred_at DESC, t.created_at DESC
      LIMIT 200
    `, [userId]),
    query<SummaryRow>(`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'income'), 0) AS income_cents,
        COALESCE(SUM(amount_cents) FILTER (WHERE kind = 'expense'), 0) AS expense_cents
      FROM finance_transactions
      WHERE account_id IN (
        SELECT id FROM finance_accounts WHERE nexo_user_id = $1
      )
    `, [userId]),
  ]);

  const accounts = accountsResult.rows.map(mapAccount);
  const transactions = transactionsResult.rows.map(mapTransaction);
  const incomeCents = Number(summaryResult.rows[0]?.income_cents ?? 0);
  const expenseCents = Number(summaryResult.rows[0]?.expense_cents ?? 0);
  const balanceCents = accounts.reduce(
    (total, account) => total + account.balanceCents,
    0,
  );

  return {
    accounts,
    transactions,
    summary: {
      balanceCents,
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
    },
  };
}

export async function createFinanceAccount(input: {
  userId: string;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
}): Promise<FinanceAccount> {
  const id = randomUUID();
  const result = await query<AccountRow>(
    `INSERT INTO finance_accounts (
      id, nexo_user_id, name, type, currency, initial_balance_cents, created_at
    ) VALUES ($1, $2, $3, $4, 'MXN', $5, NOW())
    RETURNING
      id,
      name,
      type,
      currency,
      initial_balance_cents,
      0::BIGINT AS movement_balance_cents,
      created_at`,
    [id, input.userId, input.name, input.type, input.initialBalanceCents],
  );

  return mapAccount(result.rows[0]!);
}

export async function createFinanceTransaction(input: {
  userId: string;
  accountId: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amountCents: number;
  occurredAt: string;
}): Promise<FinanceTransaction | null> {
  const id = randomUUID();
  const result = await query<TransactionRow>(
    `WITH inserted AS (
      INSERT INTO finance_transactions (
        id, account_id, kind, category, description, amount_cents,
        occurred_at, created_at
      )
      SELECT $1, a.id, $3, $4, $5, $6, $7, NOW()
      FROM finance_accounts a
      WHERE a.id = $2 AND a.nexo_user_id = $8
      RETURNING *
    )
    SELECT
      i.id,
      i.transfer_id,
      i.account_id,
      a.name AS account_name,
      i.kind,
      i.category,
      i.description,
      i.amount_cents,
      i.occurred_at,
      i.created_at
    FROM inserted i
    INNER JOIN finance_accounts a ON a.id = i.account_id`,
    [
      id,
      input.accountId,
      input.kind,
      input.category,
      input.description,
      input.amountCents,
      input.occurredAt,
      input.userId,
    ],
  );

  return result.rows[0] ? mapTransaction(result.rows[0]) : null;
}

export async function createFinanceTransfer(input: {
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  description: string;
  amountCents: number;
  occurredAt: string;
}): Promise<FinanceTransaction[] | null> {
  const transferId = randomUUID();
  const expenseId = randomUUID();
  const incomeId = randomUUID();
  const result = await query<TransactionRow>(
    `WITH source_account AS (
      SELECT id
      FROM finance_accounts
      WHERE id = $2 AND nexo_user_id = $1
    ),
    destination_account AS (
      SELECT id
      FROM finance_accounts
      WHERE id = $3 AND nexo_user_id = $1
    ),
    inserted AS (
      INSERT INTO finance_transactions (
        id, transfer_id, account_id, kind, category, description,
        amount_cents, occurred_at, created_at
      )
      SELECT
        movement.id,
        $7,
        movement.account_id,
        movement.kind,
        'Transferencia',
        $6,
        $4,
        $5,
        NOW()
      FROM source_account source
      CROSS JOIN destination_account destination
      CROSS JOIN LATERAL (
        VALUES
          ($8, source.id, 'expense'),
          ($9, destination.id, 'income')
      ) AS movement(id, account_id, kind)
      RETURNING *
    )
    SELECT
      i.id,
      i.transfer_id,
      i.account_id,
      a.name AS account_name,
      i.kind,
      i.category,
      i.description,
      i.amount_cents,
      i.occurred_at,
      i.created_at
    FROM inserted i
    INNER JOIN finance_accounts a ON a.id = i.account_id
    ORDER BY CASE WHEN i.kind = 'expense' THEN 0 ELSE 1 END`,
    [
      input.userId,
      input.sourceAccountId,
      input.destinationAccountId,
      input.amountCents,
      input.occurredAt,
      input.description,
      transferId,
      expenseId,
      incomeId,
    ],
  );

  return result.rows.length === 2
    ? result.rows.map(mapTransaction)
    : null;
}

export async function deleteFinanceTransaction(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    `WITH target AS (
      SELECT t.transfer_id
      FROM finance_transactions t
      INNER JOIN finance_accounts a ON a.id = t.account_id
      WHERE t.id = $1 AND a.nexo_user_id = $2
    )
    DELETE FROM finance_transactions t
    USING finance_accounts a, target
    WHERE a.id = t.account_id
      AND a.nexo_user_id = $2
      AND (
        t.id = $1
        OR (target.transfer_id IS NOT NULL AND t.transfer_id = target.transfer_id)
      )`,
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
