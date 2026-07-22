CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_name text NOT NULL DEFAULT '',
  occupation text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT '',
  life_stage text NOT NULL DEFAULT '',
  priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  routines jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  additional_context text NOT NULL DEFAULT '',
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
