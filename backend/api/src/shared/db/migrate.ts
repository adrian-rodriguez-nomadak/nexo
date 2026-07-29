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
  "ALTER TABLE nexo_users ADD COLUMN IF NOT EXISTS password_hash TEXT",
  "ALTER TABLE nexo_users ADD COLUMN IF NOT EXISTS password_salt TEXT",
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
    CREATE TABLE IF NOT EXISTS nexo_bet_selections (
      id TEXT PRIMARY KEY,
      bet_id TEXT NOT NULL REFERENCES nexo_bets(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      selection TEXT NOT NULL,
      market TEXT,
      decimal_odds NUMERIC(10, 3) CHECK (decimal_odds >= 1.01),
      position INTEGER NOT NULL CHECK (position >= 0),
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_bet_selections_bet_position_idx ON nexo_bet_selections (bet_id, position)",
  "ALTER TABLE nexo_bet_selections ALTER COLUMN decimal_odds DROP NOT NULL",
  `
    INSERT INTO nexo_bet_selections (
      id,
      bet_id,
      event,
      selection,
      market,
      decimal_odds,
      position,
      created_at
    )
    SELECT
      'legacy-' || b.id,
      b.id,
      b.event,
      b.selection,
      b.market,
      b.decimal_odds,
      0,
      b.created_at
    FROM nexo_bets b
    WHERE NOT EXISTS (
      SELECT 1 FROM nexo_bet_selections s WHERE s.bet_id = b.id
    )
  `,
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
  "ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS transfer_id TEXT",
  "CREATE INDEX IF NOT EXISTS finance_transactions_transfer_idx ON finance_transactions (transfer_id)",
  "ALTER TABLE nexo_bets ADD COLUMN IF NOT EXISTS finance_account_id TEXT REFERENCES finance_accounts(id) ON DELETE SET NULL",
  "ALTER TABLE nexo_bets ADD COLUMN IF NOT EXISTS stake_transaction_id TEXT REFERENCES finance_transactions(id) ON DELETE SET NULL",
  "ALTER TABLE nexo_bets ADD COLUMN IF NOT EXISTS settlement_transaction_id TEXT REFERENCES finance_transactions(id) ON DELETE SET NULL",
  "CREATE INDEX IF NOT EXISTS nexo_bets_finance_account_idx ON nexo_bets (finance_account_id)",
  `
    CREATE TABLE IF NOT EXISTS nexo_meals (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL REFERENCES nexo_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      meal_type TEXT NOT NULL
        CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      notes TEXT,
      calories INTEGER CHECK (calories IS NULL OR calories >= 0),
      protein_grams NUMERIC(8, 1)
        CHECK (protein_grams IS NULL OR protein_grams >= 0),
      carbs_grams NUMERIC(8, 1)
        CHECK (carbs_grams IS NULL OR carbs_grams >= 0),
      fat_grams NUMERIC(8, 1)
        CHECK (fat_grams IS NULL OR fat_grams >= 0),
      cost_cents BIGINT NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
      finance_account_id TEXT
        REFERENCES finance_accounts(id) ON DELETE SET NULL,
      finance_transaction_id TEXT
        REFERENCES finance_transactions(id) ON DELETE SET NULL,
      eaten_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_meals_user_eaten_idx ON nexo_meals (nexo_user_id, eaten_at DESC)",
  "CREATE INDEX IF NOT EXISTS nexo_meals_finance_account_idx ON nexo_meals (finance_account_id)",
  `
    CREATE TABLE IF NOT EXISTS nexo_workouts (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL REFERENCES nexo_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT,
      duration_minutes INTEGER NOT NULL
        CHECK (duration_minutes BETWEEN 1 AND 1440),
      trained_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_workouts_user_trained_idx ON nexo_workouts (nexo_user_id, trained_at DESC)",
  `
    CREATE TABLE IF NOT EXISTS nexo_workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL
        REFERENCES nexo_workouts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      exercise_kind TEXT NOT NULL
        CHECK (exercise_kind IN ('strength', 'cardio', 'mobility')),
      sets INTEGER CHECK (sets IS NULL OR sets BETWEEN 1 AND 100),
      reps INTEGER CHECK (reps IS NULL OR reps BETWEEN 1 AND 1000),
      weight_kg NUMERIC(8, 2)
        CHECK (weight_kg IS NULL OR weight_kg >= 0),
      distance_km NUMERIC(9, 2)
        CHECK (distance_km IS NULL OR distance_km >= 0),
      duration_minutes INTEGER
        CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440),
      notes TEXT,
      position INTEGER NOT NULL CHECK (position >= 0),
      created_at TIMESTAMPTZ NOT NULL
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_workout_exercises_workout_position_idx ON nexo_workout_exercises (workout_id, position)",
  `
    CREATE TABLE IF NOT EXISTS nexo_health_profiles (
      nexo_user_id TEXT PRIMARY KEY
        REFERENCES nexo_users(id) ON DELETE CASCADE,
      height_cm NUMERIC(5, 1)
        CHECK (height_cm IS NULL OR height_cm BETWEEN 50 AND 250),
      birth_date DATE,
      biological_sex TEXT
        CHECK (
          biological_sex IS NULL OR
          biological_sex IN ('female', 'male', 'intersex', 'unspecified')
        ),
      blood_type TEXT
        CHECK (
          blood_type IS NULL OR
          blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
        ),
      allergies TEXT[] NOT NULL DEFAULT '{}',
      conditions TEXT[] NOT NULL DEFAULT '{}',
      medications TEXT[] NOT NULL DEFAULT '{}',
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      target_weight_kg NUMERIC(6, 1)
        CHECK (
          target_weight_kg IS NULL OR target_weight_kg BETWEEN 20 AND 500
        ),
      notes TEXT,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS nexo_health_entries (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL
        REFERENCES nexo_users(id) ON DELETE CASCADE,
      measured_at TIMESTAMPTZ NOT NULL,
      weight_kg NUMERIC(6, 1)
        CHECK (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 500),
      sleep_hours NUMERIC(4, 1)
        CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24),
      water_ml INTEGER
        CHECK (water_ml IS NULL OR water_ml BETWEEN 0 AND 20000),
      heart_rate_bpm INTEGER
        CHECK (heart_rate_bpm IS NULL OR heart_rate_bpm BETWEEN 20 AND 300),
      systolic_mm_hg INTEGER
        CHECK (systolic_mm_hg IS NULL OR systolic_mm_hg BETWEEN 50 AND 300),
      diastolic_mm_hg INTEGER
        CHECK (diastolic_mm_hg IS NULL OR diastolic_mm_hg BETWEEN 30 AND 200),
      glucose_mg_dl NUMERIC(6, 1)
        CHECK (glucose_mg_dl IS NULL OR glucose_mg_dl BETWEEN 20 AND 1000),
      oxygen_percent NUMERIC(5, 1)
        CHECK (oxygen_percent IS NULL OR oxygen_percent BETWEEN 50 AND 100),
      temperature_c NUMERIC(4, 1)
        CHECK (temperature_c IS NULL OR temperature_c BETWEEN 30 AND 45),
      mood INTEGER CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
      symptoms TEXT[] NOT NULL DEFAULT '{}',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      CHECK (
        (systolic_mm_hg IS NULL AND diastolic_mm_hg IS NULL) OR
        (systolic_mm_hg IS NOT NULL AND diastolic_mm_hg IS NOT NULL)
      )
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_health_entries_user_measured_idx ON nexo_health_entries (nexo_user_id, measured_at DESC)",
  `
    CREATE TABLE IF NOT EXISTS nexo_memories (
      id TEXT PRIMARY KEY,
      nexo_user_id TEXT NOT NULL
        REFERENCES nexo_users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      memory_kind TEXT NOT NULL
        CHECK (memory_kind IN ('fact', 'event', 'preference', 'goal', 'pattern')),
      module TEXT,
      source TEXT NOT NULL
        CHECK (source IN ('omi', 'observer', 'manual', 'derived')),
      source_record_ids TEXT[] NOT NULL DEFAULT '{}',
      confidence NUMERIC(4, 3) NOT NULL
        CHECK (confidence BETWEEN 0 AND 1),
      sensitivity TEXT NOT NULL
        CHECK (sensitivity IN ('normal', 'sensitive', 'restricted')),
      user_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'superseded', 'rejected')),
      fingerprint TEXT NOT NULL,
      occurred_at TIMESTAMPTZ,
      valid_until TIMESTAMPTZ,
      first_seen_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1
        CHECK (occurrence_count >= 1),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (nexo_user_id, fingerprint)
    )
  `,
  "CREATE INDEX IF NOT EXISTS nexo_memories_user_updated_idx ON nexo_memories (nexo_user_id, status, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS nexo_memories_user_kind_idx ON nexo_memories (nexo_user_id, memory_kind)",
  "CREATE INDEX IF NOT EXISTS nexo_memories_source_records_idx ON nexo_memories USING GIN (source_record_ids)",
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
