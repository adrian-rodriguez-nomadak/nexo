BEGIN;

CREATE TABLE sports_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  country varchar(80) NOT NULL,
  logo_url text,
  current_season integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sports_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  short_name varchar(40),
  logo_url text,
  stadium varchar(160),
  city varchar(120),
  latitude numeric(9,6),
  longitude numeric(9,6),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sports_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key varchar(80) NOT NULL UNIQUE,
  team_id uuid REFERENCES sports_teams(id) ON DELETE SET NULL,
  name varchar(180) NOT NULL,
  position varchar(80),
  photo_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sports_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key varchar(80) NOT NULL UNIQUE,
  league_id uuid REFERENCES sports_leagues(id) ON DELETE SET NULL,
  home_team_id uuid NOT NULL REFERENCES sports_teams(id),
  away_team_id uuid NOT NULL REFERENCES sports_teams(id),
  match_date timestamptz NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'scheduled',
  home_score integer,
  away_score integer,
  venue varchar(180),
  matchday varchar(80),
  provider_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sports_matches_date_idx ON sports_matches(match_date);
CREATE INDEX sports_matches_teams_idx ON sports_matches(home_team_id, away_team_id);

CREATE TABLE team_match_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES sports_matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  possession numeric(5,2),
  shots integer,
  shots_on_target integer,
  corners integer,
  fouls integer,
  yellow_cards integer,
  red_cards integer,
  expected_goals numeric(6,3),
  source varchar(80) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, team_id, source)
);

CREATE TABLE sports_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES sports_leagues(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  season integer NOT NULL,
  matches_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  position integer NOT NULL,
  form varchar(20),
  source varchar(80) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, team_id, season, source)
);

CREATE TABLE player_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES sports_matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES sports_players(id) ON DELETE SET NULL,
  team_id uuid NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  player_name varchar(180) NOT NULL,
  status varchar(40) NOT NULL,
  reason varchar(240),
  source varchar(80) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX player_availability_match_idx ON player_availability(match_id, team_id);

CREATE TABLE match_weather (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES sports_matches(id) ON DELETE CASCADE,
  temperature_c numeric(5,2),
  precipitation_probability numeric(5,2),
  precipitation_mm numeric(7,2),
  wind_kmh numeric(6,2),
  humidity numeric(5,2),
  weather_code integer,
  source varchar(80) NOT NULL,
  forecast_for timestamptz NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, source)
);

CREATE TABLE match_odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES sports_matches(id) ON DELETE CASCADE,
  bookmaker varchar(120) NOT NULL,
  market varchar(120) NOT NULL,
  selection varchar(160) NOT NULL,
  odds numeric(8,3) NOT NULL CHECK (odds > 1),
  source varchar(80) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX match_odds_lookup_idx ON match_odds(match_id, market, captured_at DESC);

CREATE TABLE match_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES sports_matches(id) ON DELETE SET NULL,
  match_provider_key varchar(80) NOT NULL,
  input_snapshot jsonb NOT NULL,
  result jsonb NOT NULL,
  model_version varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX match_analyses_user_created_idx ON match_analyses(user_id, created_at DESC);

CREATE TABLE bet_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookmaker varchar(120),
  stake numeric(12,2) NOT NULL CHECK (stake > 0),
  bankroll numeric(12,2) NOT NULL CHECK (bankroll > 0),
  total_odds numeric(10,3) NOT NULL CHECK (total_odds > 1),
  ticket jsonb NOT NULL,
  result jsonb NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'analyzed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bet_analyses_user_created_idx ON bet_analyses(user_id, created_at DESC);

CREATE TABLE sports_provider_cache (
  cache_key varchar(240) PRIMARY KEY,
  provider varchar(80) NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sports_provider_cache_expiry_idx ON sports_provider_cache(expires_at);

COMMIT;
