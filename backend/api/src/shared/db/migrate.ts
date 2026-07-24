import { pool } from "./database.js";

const statements = [
  `
    CREATE TABLE IF NOT EXISTS nexo_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS nexo_auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES nexo_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_auth_sessions_user_idx ON nexo_auth_sessions (user_id)",
  "CREATE INDEX IF NOT EXISTS nexo_auth_sessions_expiry_idx ON nexo_auth_sessions (expires_at)",
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
  "ALTER TABLE captures ADD COLUMN IF NOT EXISTS nexo_user_id TEXT REFERENCES nexo_users(id) ON DELETE CASCADE",
  "CREATE INDEX IF NOT EXISTS captures_nexo_user_created_idx ON captures (nexo_user_id, created_at DESC)",
  `
    CREATE TABLE IF NOT EXISTS nexo_events (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL REFERENCES nexo_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      all_day BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL,
      CHECK (ends_at IS NULL OR ends_at > starts_at)
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_events_user_start_idx ON nexo_events (nexo_user_id, starts_at)",
  `
    CREATE TABLE IF NOT EXISTS nexo_notes (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL REFERENCES nexo_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_notes_user_updated_idx ON nexo_notes (nexo_user_id, is_pinned DESC, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS nexo_notes_tags_idx ON nexo_notes USING GIN (tags)",
  `
    CREATE TABLE IF NOT EXISTS nexo_bet_settings (
      nexo_user_id TEXT PRIMARY KEY REFERENCES nexo_users(id) ON DELETE CASCADE,
      bankroll_cents BIGINT NOT NULL DEFAULT 0 CHECK (bankroll_cents >= 0),
      monthly_limit_cents BIGINT NOT NULL DEFAULT 0 CHECK (monthly_limit_cents >= 0),
      updated_at TIMESTAMPTZ NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS nexo_bets (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL REFERENCES nexo_users(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      selection TEXT NOT NULL,
      market TEXT,
      sportsbook TEXT,
      stake_cents BIGINT NOT NULL CHECK (stake_cents > 0),
      decimal_odds NUMERIC(10, 3) NOT NULL CHECK (decimal_odds >= 1.01),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'won', 'lost', 'void')),
      placed_at TIMESTAMPTZ NOT NULL,
      settled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_bets_user_placed_idx ON nexo_bets (nexo_user_id, placed_at DESC)",
  "CREATE INDEX IF NOT EXISTS nexo_bets_user_status_idx ON nexo_bets (nexo_user_id, status)",
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
  "ALTER TABLE finance_accounts ADD COLUMN IF NOT EXISTS nexo_user_id TEXT REFERENCES nexo_users(id) ON DELETE CASCADE",
  "CREATE INDEX IF NOT EXISTS finance_accounts_nexo_user_idx ON finance_accounts (nexo_user_id)",
  "CREATE INDEX IF NOT EXISTS finance_transactions_account_idx ON finance_transactions (account_id)",
  "CREATE INDEX IF NOT EXISTS finance_transactions_occurred_at_idx ON finance_transactions (occurred_at DESC)",
  "ALTER TABLE nexo_bets ADD COLUMN IF NOT EXISTS finance_account_id TEXT REFERENCES finance_accounts(id) ON DELETE SET NULL",
  "ALTER TABLE nexo_bets ADD COLUMN IF NOT EXISTS stake_transaction_id TEXT REFERENCES finance_transactions(id) ON DELETE SET NULL",
  "ALTER TABLE nexo_bets ADD COLUMN IF NOT EXISTS settlement_transaction_id TEXT REFERENCES finance_transactions(id) ON DELETE SET NULL",
  "CREATE INDEX IF NOT EXISTS nexo_bets_finance_account_idx ON nexo_bets (finance_account_id)",
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
