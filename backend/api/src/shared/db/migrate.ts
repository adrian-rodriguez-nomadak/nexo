import { pool } from "./database.js";

const statements = [
  `
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      occurred_at TIMESTAMPTZ,
      amount_cents BIGINT
    )
  `,
  "CREATE INDEX IF NOT EXISTS captures_created_at_idx ON captures (created_at DESC)",
  "CREATE INDEX IF NOT EXISTS captures_module_idx ON captures (module)",
  `
    CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'MXN',
      initial_balance_cents BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
      kind TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents BIGINT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS finance_accounts_created_at_idx ON finance_accounts (created_at)",
  "CREATE INDEX IF NOT EXISTS finance_transactions_account_idx ON finance_transactions (account_id)",
  "CREATE INDEX IF NOT EXISTS finance_transactions_occurred_at_idx ON finance_transactions (occurred_at DESC)",
];

export async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("migrate.js")) {
  migrate()
    .then(() => {
      console.log("Database migration completed.");
    })
    .catch((error) => {
      console.error("Database migration failed.", error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
