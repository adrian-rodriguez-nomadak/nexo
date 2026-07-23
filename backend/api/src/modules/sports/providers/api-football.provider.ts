import { env } from "../../../config/env.js";
import type {
  AnalysisInput,
  AvailabilityItem,
  HeadToHeadItem,
  MatchSummary,
  TeamSummary,
} from "../sports.types.js";

type ApiResponse<T> = { response?: T; errors?: unknown };

async function apiFootball<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": env.apiFootballKey },
    signal,
  });
  if (!response.ok)
    throw new Error(`API-Football responded ${response.status}`);
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.response) throw new Error("API-Football returned no data");
  return payload.response;
}

function status(value: string): MatchSummary["status"] {
  if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(value)) return "live";
  if (["FT", "AET", "PEN"].includes(value)) return "finished";
  if (["PST", "CANC", "ABD"].includes(value)) return "postponed";
  return "scheduled";
}

function form(value?: string | null) {
  return (value ?? "")
    .split("")
    .filter((item) => ["W", "D", "L"].includes(item))
    .slice(-5);
}

function teamFromFixture(
  value: Record<string, unknown>,
  standing?: Record<string, unknown>,
): TeamSummary {
  const all = standing?.all as Record<string, unknown> | undefined;
  const goals = all?.goals as
    Record<string, Record<string, number>> | undefined;
  const played = Number(all?.played ?? 0);
  const rawForm = form(standing?.form as string | undefined);
  return {
    id: `api-football-team-${String(value.id)}`,
    providerId: Number(value.id),
    name: String(value.name ?? "Equipo"),
    shortName: String(value.name ?? "EQ")
      .slice(0, 3)
      .toUpperCase(),
    logoUrl: typeof value.logo === "string" ? value.logo : undefined,
    position: Number(standing?.rank ?? 0),
    points: Number(standing?.points ?? 0),
    matchesPlayed: played,
    form: rawForm,
    formLabel: rawForm.length
      ? `${rawForm.filter((x) => x === "W").length}V · ${rawForm.filter((x) => x === "D").length}E · ${rawForm.filter((x) => x === "L").length}D`
      : "Sin racha",
    goalsForAverage: played ? Number(goals?.for?.total ?? 0) / played : 1.35,
    goalsAgainstAverage: played
      ? Number(goals?.against?.total ?? 0) / played
      : 1.25,
    homeAwayStrength: 0.58,
    unavailablePlayers: 0,
  };
}

export const apiFootballProvider = {
  enabled: () => Boolean(env.apiFootballKey),

  async conservativeOdds(
    fixtureId: number,
    market: string,
  ): Promise<{ odds: number; bookmaker: string } | null> {
    const rows = await apiFootball<Array<Record<string, unknown>>>(
      `/odds?fixture=${fixtureId}`,
    ).catch(() => []);
    const bookmakers = (rows[0]?.bookmakers ?? []) as Array<
      Record<string, unknown>
    >;
    const wantsGoals = market.toLowerCase().includes("1.5");
    const wantsHome = market.toLowerCase().includes("local");
    const wantsAway = market.toLowerCase().includes("visitante");
    for (const bookmaker of bookmakers) {
      const bets = (bookmaker.bets ?? []) as Array<Record<string, unknown>>;
      for (const bet of bets) {
        const betName = String(bet.name ?? "").toLowerCase();
        const values = (bet.values ?? []) as Array<Record<string, unknown>>;
        const value = values.find((candidate) => {
          const label = String(candidate.value ?? "").toLowerCase();
          if (wantsGoals)
            return (
              betName.includes("goals over") &&
              (label === "over 1.5" || label === "over 1.5 goals")
            );
          if (!betName.includes("double chance")) return false;
          if (wantsHome)
            return ["home or draw", "1x", "home/draw"].includes(label);
          if (wantsAway)
            return ["draw or away", "x2", "draw/away"].includes(label);
          return false;
        });
        const odds = Number(value?.odd);
        if (Number.isFinite(odds) && odds > 1)
          return {
            odds,
            bookmaker: String(bookmaker.name ?? "API-Football"),
          };
      }
    }
    return null;
  },

  async upcoming(): Promise<MatchSummary[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7_000);
    try {
      const [fixtures, standingsPayload] = await Promise.all([
        apiFootball<Array<Record<string, unknown>>>(
          `/fixtures?league=${env.apiFootballLeagueId}&season=${env.apiFootballSeason}&next=12`,
          controller.signal,
        ),
        apiFootball<Array<Record<string, unknown>>>(
          `/standings?league=${env.apiFootballLeagueId}&season=${env.apiFootballSeason}`,
          controller.signal,
        ).catch(() => []),
      ]);
      const leagueStanding = standingsPayload[0]?.league as
        Record<string, unknown> | undefined;
      const groups = leagueStanding?.standings as
        Array<Array<Record<string, unknown>>> | undefined;
      const standings = groups?.flat() ?? [];
      return fixtures.map((row) => {
        const fixture = row.fixture as Record<string, unknown>;
        const league = row.league as Record<string, unknown>;
        const fixtureStatus = fixture.status as Record<string, unknown>;
        const venue = fixture.venue as Record<string, unknown>;
        const fixtureTeams = row.teams as Record<
          string,
          Record<string, unknown>
        >;
        const homeStanding = standings.find(
          (item) =>
            (item.team as Record<string, unknown>)?.id === fixtureTeams.home.id,
        );
        const awayStanding = standings.find(
          (item) =>
            (item.team as Record<string, unknown>)?.id === fixtureTeams.away.id,
        );
        return {
          id: `api-football-${String(fixture.id)}`,
          providerFixtureId: Number(fixture.id),
          startsAt: String(fixture.date),
          matchday: String(league.round ?? "Liga MX"),
          venue: String(venue?.name ?? "Por confirmar"),
          status: status(String(fixtureStatus?.short ?? "NS")),
          home: teamFromFixture(fixtureTeams.home, homeStanding),
          away: teamFromFixture(fixtureTeams.away, awayStanding),
          sources: ["api-football"],
          dataFreshness: "Actualizado desde API-Football",
        } satisfies MatchSummary;
      });
    } finally {
      clearTimeout(timeout);
    }
  },

  async context(match: MatchSummary): Promise<Partial<AnalysisInput>> {
    if (!match.providerFixtureId) return {};
    const fixtureId = match.providerFixtureId;
    const homeId = match.home.providerId;
    const awayId = match.away.providerId;
    const [injuries, headToHead] = await Promise.all([
      apiFootball<Array<Record<string, unknown>>>(
        `/injuries?fixture=${fixtureId}`,
      ).catch(() => []),
      homeId && awayId
        ? apiFootball<Array<Record<string, unknown>>>(
            `/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`,
          ).catch(() => [])
        : Promise.resolve([]),
    ]);
    const availability: AvailabilityItem[] = injuries.map((row) => {
      const player = row.player as Record<string, unknown>;
      const team = row.team as Record<string, unknown>;
      const fixture = row.fixture as Record<string, unknown>;
      const teamId =
        Number(team.id) === Number(homeId) ? match.home.id : match.away.id;
      const type = String(player.type ?? "Missing Fixture").toLowerCase();
      return {
        teamId,
        playerName: String(player.name ?? "Jugador"),
        status: type.includes("susp")
          ? "suspended"
          : type.includes("doubt")
            ? "doubtful"
            : "injured",
        reason: String(player.reason ?? fixture.status ?? "No disponible"),
        source: "api-football",
      };
    });
    const history: HeadToHeadItem[] = headToHead.map((row) => {
      const fixture = row.fixture as Record<string, unknown>;
      const teams = row.teams as Record<string, Record<string, unknown>>;
      const goals = row.goals as Record<string, number>;
      return {
        date: String(fixture.date ?? "").slice(0, 10),
        home: String(teams.home.name),
        away: String(teams.away.name),
        homeScore: Number(goals.home ?? 0),
        awayScore: Number(goals.away ?? 0),
      };
    });
    return {
      availability,
      headToHead: history,
      coverage: {
        standings: match.home.matchesPlayed > 0 || match.away.matchesPlayed > 0,
        form: match.home.form.length > 0 || match.away.form.length > 0,
        availability: true,
        headToHead: history.length > 0,
        weather: Boolean(match.weather),
      },
    };
  },
};
