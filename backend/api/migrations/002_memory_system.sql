CREATE TABLE IF NOT EXISTS memory_profiles (
  owner_key text PRIMARY KEY,
  compressed_summary text NOT NULL DEFAULT '',
  known_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  recurring_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_notes (
  id uuid PRIMARY KEY,
  owner_key text NOT NULL REFERENCES memory_profiles(owner_key) ON DELETE CASCADE,
  raw_text text NOT NULL,
  summary text NOT NULL DEFAULT '',
  analysis jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  occurred_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'mobile',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_notes_owner_occurred_idx
  ON memory_notes(owner_key, occurred_at DESC);
