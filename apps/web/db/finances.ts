import { env } from "cloudflare:workers";

export const accountTypes = ["cash", "bank", "savings", "credit"] as const;
export const transactionKinds = ["income", "expense"] as const;

export type AccountType = (typeof accountTypes)[number];
export type TransactionKind = (typeof transactionKinds)[number];

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
  initial_balance_cents: number;
  movement_balance_cents: number;
  created_at: string;
};

type TransactionRow = {
  id: string;
  account_id: string;
  account_name: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amount_cents: number;
  occurred_at: string;
  created_at: string;
};

let initialization: Promise<void> | null = null;

function getDatabase(): D1Database {
  if (!env.DB) {
    throw new Error("La base de datos de Finanzas no está disponible.");
  }

  return env.DB;
}

async function ensureFinanceDatabase(): Promise<void> {
  if (initialization) return initialization;

  const database = getDatabase();
  initialization = database
    .batch([
      database.prepare(`
        CREATE TABLE IF NOT EXISTS finance_accounts (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'MXN',
          initial_balance_cents INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS finance_transactions (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          occurred_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES finance_accounts(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT
        )
      `),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS finance_accounts_created_at_idx ON finance_accounts (created_at)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS finance_transactions_account_idx ON finance_transactions (account_id)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS finance_transactions_occurred_at_idx ON finance_transactions (occurred_at)",
      ),
    ])
    .then(() => undefined)
    .catch((error) => {
      initialization = null;
      throw error;
    });

  return initialization;
}

function mapAccount(row: AccountRow): FinanceAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initialBalanceCents: row.initial_balance_cents,
    balanceCents:
      row.initial_balance_cents + row.movement_balance_cents,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: TransactionRow): FinanceTransaction {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    kind: row.kind,
    category: row.category,
    description: row.description,
    amountCents: row.amount_cents,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export function normalizeLabel(
  value: unknown,
  maximumLength = 80,
): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;

  return normalized;
}

export function isAccountType(value: unknown): value is AccountType {
  return (
    typeof value === "string" &&
    accountTypes.includes(value as AccountType)
  );
}

export function isTransactionKind(
  value: unknown,
): value is TransactionKind {
  return (
    typeof value === "string" &&
    transactionKinds.includes(value as TransactionKind)
  );
}

export function isValidCents(
  value: unknown,
  options: { allowNegative?: boolean } = {},
): value is number {
  if (!Number.isSafeInteger(value)) return false;
  if (Math.abs(value as number) > 100_000_000_000) return false;
  return options.allowNegative ? true : (value as number) > 0;
}

export function normalizeOccurredAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export async function getFinances(): Promise<{
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  summary: FinanceSummary;
}> {
  await ensureFinanceDatabase();
  const database = getDatabase();
  const [accountsResult, transactionsResult] = await database.batch([
    database.prepare(`
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
      GROUP BY a.id
      ORDER BY a.created_at ASC
    `),
    database.prepare(`
      SELECT
        t.id,
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
      ORDER BY t.occurred_at DESC, t.created_at DESC
      LIMIT 200
    `),
  ]);

  const accounts = (accountsResult.results as AccountRow[]).map(mapAccount);
  const transactions = (
    transactionsResult.results as TransactionRow[]
  ).map(mapTransaction);
  const incomeCents = transactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const expenseCents = transactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
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
  name: string;
  type: AccountType;
  initialBalanceCents: number;
}): Promise<FinanceAccount> {
  await ensureFinanceDatabase();
  const account: FinanceAccount = {
    id: crypto.randomUUID(),
    name: input.name,
    type: input.type,
    currency: "MXN",
    initialBalanceCents: input.initialBalanceCents,
    balanceCents: input.initialBalanceCents,
    createdAt: new Date().toISOString(),
  };

  await getDatabase()
    .prepare(
      `INSERT INTO finance_accounts (
        id, name, type, currency, initial_balance_cents, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      account.id,
      account.name,
      account.type,
      account.currency,
      account.initialBalanceCents,
      account.createdAt,
    )
    .run();

  return account;
}

export async function createFinanceTransaction(input: {
  accountId: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amountCents: number;
  occurredAt: string;
}): Promise<FinanceTransaction | null> {
  await ensureFinanceDatabase();
  const database = getDatabase();
  const account = await database
    .prepare("SELECT name FROM finance_accounts WHERE id = ?")
    .bind(input.accountId)
    .first<{ name: string }>();

  if (!account) return null;

  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    accountName: account.name,
    kind: input.kind,
    category: input.category,
    description: input.description,
    amountCents: input.amountCents,
    occurredAt: input.occurredAt,
    createdAt: new Date().toISOString(),
  };

  await database
    .prepare(
      `INSERT INTO finance_transactions (
        id, account_id, kind, category, description, amount_cents,
        occurred_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      transaction.id,
      transaction.accountId,
      transaction.kind,
      transaction.category,
      transaction.description,
      transaction.amountCents,
      transaction.occurredAt,
      transaction.createdAt,
    )
    .run();

  return transaction;
}

export async function deleteFinanceTransaction(
  id: string,
): Promise<boolean> {
  await ensureFinanceDatabase();
  const result = await getDatabase()
    .prepare("DELETE FROM finance_transactions WHERE id = ?")
    .bind(id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}
