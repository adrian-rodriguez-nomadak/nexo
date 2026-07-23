export type DataSource = "api-football" | "thesportsdb" | "open-meteo" | "demo";

export type TeamSummary = {
  id: string;
  providerId?: number | string;
  name: string;
  shortName: string;
  logoUrl?: string;
  stadium?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  position: number;
  points: number;
  form: string[];
  formLabel: string;
  goalsForAverage: number;
  goalsAgainstAverage: number;
  homeAwayStrength: number;
  unavailablePlayers: number;
};

export type MatchWeather = {
  temperatureC: number;
  precipitationProbability: number;
  precipitationMm: number;
  windKmh: number;
  humidity: number;
  weatherCode: number;
  label: string;
  impact: "low" | "medium" | "high";
  source: DataSource;
};

export type MatchSummary = {
  id: string;
  providerFixtureId?: number | string;
  startsAt: string;
  matchday: string;
  venue: string;
  status: "scheduled" | "live" | "finished" | "postponed";
  home: TeamSummary;
  away: TeamSummary;
  weather?: MatchWeather;
  sources: DataSource[];
  dataFreshness: string;
};

export type AvailabilityItem = {
  teamId: string;
  playerName: string;
  status: "injured" | "suspended" | "doubtful" | "unavailable";
  reason: string;
  source: DataSource;
};

export type HeadToHeadItem = {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
};

export type AnalysisInput = {
  match: MatchSummary;
  availability: AvailabilityItem[];
  headToHead: HeadToHeadItem[];
  restDays: { home: number; away: number };
};

export type MatchAnalysis = {
  matchId: string;
  generatedAt: string;
  modelVersion: string;
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  goals: {
    over1_5: number;
    over2_5: number;
    bothTeamsScore: number;
    expectedTotal: number;
  };
  confidence: number;
  expectedScenario: string;
  summary: string;
  keyFactors: string[];
  uncertainties: string[];
  saferMarkets: Array<{
    market: string;
    probability: number;
    risk: "low" | "medium" | "high";
  }>;
  factorScores: {
    recentForm: number;
    homeAwayPerformance: number;
    goalsForAgainst: number;
    tablePosition: number;
    headToHead: number;
    playerAvailability: number;
    restDays: number;
    weather: number;
  };
};

export type BetSelection = {
  match: string;
  market: string;
  selection: string;
  odds: number;
  estimatedProbability?: number;
};

export type BetTicket = {
  bookmaker?: string;
  stake: number;
  bankroll: number;
  totalOdds: number;
  betType: "single" | "parlay";
  confirmed: boolean;
  selections: BetSelection[];
};

export type BetRiskAnalysis = {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  requestedStake: number;
  bankroll: number;
  bankrollExposure: number;
  impliedProbability: number;
  estimatedProbability: number;
  expectedValue: number;
  recommendedMaximumStake: number;
  decision:
    | "reasonable"
    | "reduce_stake"
    | "not_recommended_at_requested_amount"
    | "not_recommended";
  warnings: string[];
  summary: string;
};
