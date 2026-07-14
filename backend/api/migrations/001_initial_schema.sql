BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash varchar(255),
  pin_enabled boolean NOT NULL DEFAULT false,
  biometric_enabled boolean NOT NULL DEFAULT false,
  budget_type varchar(40) NOT NULL DEFAULT 'biweekly',
  currency varchar(3) NOT NULL DEFAULT 'MXN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)))
);
CREATE UNIQUE INDEX users_email_unique_idx ON users (lower(email));

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash varchar(64) NOT NULL UNIQUE,
  token_family uuid NOT NULL,
  device_name varchar(255),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_active_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  type varchar(40) NOT NULL,
  color varchar(255),
  icon varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, type)
);

CREATE TABLE finance_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(40) NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
  description varchar(255),
  movement_date date NOT NULL,
  payment_method varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_movements_user_date_idx ON finance_movements(user_id, movement_date DESC);
CREATE INDEX finance_movements_category_idx ON finance_movements(category_id);

CREATE TABLE upcoming_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  category varchar(255),
  status varchar(40) NOT NULL DEFAULT 'pending',
  repeat_type varchar(40) NOT NULL DEFAULT 'none',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX upcoming_payments_user_due_idx ON upcoming_payments(user_id, due_date);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  billing_day integer NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  frequency varchar(40) NOT NULL DEFAULT 'monthly',
  category varchar(255),
  status varchar(40) NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_user_status_idx ON subscriptions(user_id, status);

CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  type varchar(40) NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  pending_amount numeric(12,2) NOT NULL CHECK (pending_amount >= 0),
  due_date date,
  status varchar(40) NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pending_amount <= total_amount)
);
CREATE INDEX debts_user_status_idx ON debts(user_id, status);

CREATE TABLE debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX debt_payments_debt_date_idx ON debt_payments(debt_id, payment_date DESC);

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location_name varchar(255),
  repeat_type varchar(40) NOT NULL DEFAULT 'none',
  status varchar(40) NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at IS NULL OR end_at >= start_at)
);
CREATE INDEX calendar_events_user_start_idx ON calendar_events(user_id, start_at);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  due_date date,
  priority varchar(40) NOT NULL DEFAULT 'medium',
  status varchar(40) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_user_due_idx ON tasks(user_id, due_date);
CREATE INDEX tasks_user_status_idx ON tasks(user_id, status);

CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  remind_at timestamptz NOT NULL,
  repeat_type varchar(40) NOT NULL DEFAULT 'none',
  status varchar(40) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reminders_user_time_idx ON reminders(user_id, remind_at);

CREATE TABLE inbox_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  detected_intent varchar(255) NOT NULL,
  structured_payload jsonb NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inbox_actions_user_created_idx ON inbox_actions(user_id, created_at DESC);

DO $$ BEGIN
  CREATE TYPE sync_operation AS ENUM ('upsert', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE sync_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity varchar(40) NOT NULL,
  record_id varchar(100) NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  payload jsonb,
  deleted_at timestamptz,
  client_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity, record_id)
);

CREATE TABLE sync_changes (
  sequence bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  entity varchar(40) NOT NULL,
  record_id varchar(100) NOT NULL,
  operation sync_operation NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb,
  changed_at timestamptz NOT NULL,
  UNIQUE(user_id, operation_id)
);
CREATE INDEX sync_changes_user_cursor_idx ON sync_changes(user_id, sequence);

COMMIT;
