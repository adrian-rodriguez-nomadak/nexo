import { env } from "../../../config/env.js";
import type {
  AnalysisInput,
  HeadToHeadItem,
  MatchSummary,
  TeamSummary,
} from "../sports.types.js";

type SportsDbEvent = Record<string, string | null>;

type TeamStats = {
  id: string;
  name: string;
  badge?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string[];
  homePoints: number;
  homePlayed: number;
  awayPoints: number;
  awayPlayed: number;
  lastMatchAt?: string;
  position: number;
};

let seasonCache:
  { season: string; expiresAt: number; events: SportsDbEvent[] } | undefined;

function seasonLabel() {
  return `${env.apiFootballSeason}-${env.apiFootballSeason + 1}`;
}

async function fetchSeason(): Promise<SportsDbEvent[]> {
  const season = seasonLabel();
  if (seasonCache?.season === season && seasonCache.expiresAt > Date.now()) {
    return seasonCache.events;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${env.sportsDbApiKey}/eventsseason.php?id=${env.sportsDbLigaMxId}&s=${season}`,
      { signal: controller.signal },
    );
    if (!response.ok)
      throw new Error(`TheSportsDB responded ${response.status}`);
    const payload = (await response.json()) as {
      events?: SportsDbEvent[] | null;
    };
    const seasonEvents = payload.events ?? [];
    const latestRound = Math.max(
      1,
      ...seasonEvents.map((event) => Number(event.intRound ?? 0)),
    );
    const roundResponse = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${env.sportsDbApiKey}/eventsround.php?id=${env.sportsDbLigaMxId}&r=${latestRound}&s=${season}`,
      { signal: controller.signal },
    );
    const roundPayload = roundResponse.ok
      ? ((await roundResponse.json()) as {
          events?: SportsDbEvent[] | null;
        })
      : { events: [] };
    const eventsById = new Map(
      [...seasonEvents, ...(roundPayload.events ?? [])].map((event) => [
        event.idEvent ?? `${event.strEvent}-${event.strTimestamp}`,
        event,
      ]),
    );
    const events = [...eventsById.values()];
    seasonCache = {
      season,
      events,
      expiresAt: Date.now() + 30 * 60_000,
    };
    return events;
  } finally {
    clearTimeout(timeout);
  }
}

function isFinished(event: SportsDbEvent) {
  return (
    ["FT", "AET", "PEN"].includes(event.strStatus ?? "") &&
    event.intHomeScore != null &&
    event.intAwayScore != null
  );
}

export function normalizeSportsDbTimestamp(event: SportsDbEvent) {
  const timestamp =
    event.strTimestamp ?? `${event.dateEvent}T${event.strTime ?? "12:00:00"}`;
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`;
}

function buildStats(events: SportsDbEvent[]) {
  const stats = new Map<string, TeamStats>();
  const ensure = (
    id: string | null,
    name: string | null,
    badge: string | null,
  ) => {
    const key = id ?? name ?? "unknown";
    if (!stats.has(key)) {
      stats.set(key, {
        id: key,
        name: name ?? "Equipo",
        badge: badge ?? undefined,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: [],
        homePoints: 0,
        homePlayed: 0,
        awayPoints: 0,
        awayPlayed: 0,
        position: 0,
      });
    }
    return stats.get(key)!;
  };

  const completed = events
    .filter(isFinished)
    .sort((left, right) =>
      normalizeSportsDbTimestamp(left).localeCompare(
        normalizeSportsDbTimestamp(right),
      ),
    );

  for (const event of completed) {
    const home = ensure(
      event.idHomeTeam,
      event.strHomeTeam,
      event.strHomeTeamBadge,
    );
    const away = ensure(
      event.idAwayTeam,
      event.strAwayTeam,
      event.strAwayTeamBadge,
    );
    const homeScore = Number(event.intHomeScore);
    const awayScore = Number(event.intAwayScore);
    home.played += 1;
    away.played += 1;
    home.homePlayed += 1;
    away.awayPlayed += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;
    home.lastMatchAt = normalizeSportsDbTimestamp(event);
    away.lastMatchAt = normalizeSportsDbTimestamp(event);

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
      home.homePoints += 3;
      home.form.push("W");
      away.form.push("L");
    } else if (homeScore < awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
      away.awayPoints += 3;
      home.form.push("L");
      away.form.push("W");
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
      home.homePoints += 1;
      away.awayPoints += 1;
      home.form.push("D");
      away.form.push("D");
    }
  }

  const ranking = [...stats.values()].sort(
    (left, right) =>
      right.points - left.points ||
      right.goalsFor -
        right.goalsAgainst -
        (left.goalsFor - left.goalsAgainst) ||
      right.goalsFor - left.goalsFor,
  );
  ranking.forEach((team, index) => {
    team.position = index + 1;
  });
  return stats;
}

function formLabel(form: string[]) {
  const recent = form.slice(-5);
  if (!recent.length) return "Sin partidos";
  return `${recent.filter((item) => item === "W").length}V · ${recent.filter((item) => item === "D").length}E · ${recent.filter((item) => item === "L").length}D`;
}

function parseTeam(
  event: SportsDbEvent,
  side: "Home" | "Away",
  stats: Map<string, TeamStats>,
): TeamSummary {
  const name = event[`str${side}Team`] ?? "Equipo";
  const id = event[`id${side}Team`] ?? name.toLowerCase().replace(/\W+/g, "-");
  const badge = event[`str${side}TeamBadge`];
  const teamStats = stats.get(id);
  const sidePlayed =
    side === "Home" ? teamStats?.homePlayed : teamStats?.awayPlayed;
  const sidePoints =
    side === "Home" ? teamStats?.homePoints : teamStats?.awayPoints;
  return {
    id: `sportsdb-team-${id}`,
    providerId: id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    logoUrl: badge ?? teamStats?.badge,
    position: teamStats?.position ?? 0,
    points: teamStats?.points ?? 0,
    matchesPlayed: teamStats?.played ?? 0,
    form: teamStats?.form.slice(-5) ?? [],
    formLabel: formLabel(teamStats?.form ?? []),
    goalsForAverage: teamStats?.played
      ? teamStats.goalsFor / teamStats.played
      : 1.35,
    goalsAgainstAverage: teamStats?.played
      ? teamStats.goalsAgainst / teamStats.played
      : 1.25,
    homeAwayStrength: sidePlayed
      ? Number(sidePoints) / (Number(sidePlayed) * 3)
      : side === "Home"
        ? 0.58
        : 0.5,
    unavailablePlayers: null,
    lastMatchAt: teamStats?.lastMatchAt,
  };
}

function matchStatus(event: SportsDbEvent): MatchSummary["status"] {
  if (isFinished(event)) return "finished";
  if (["1H", "HT", "2H", "ET", "LIVE"].includes(event.strStatus ?? ""))
    return "live";
  if (
    event.strPostponed === "yes" ||
    ["PST", "CANC", "ABD"].includes(event.strStatus ?? "")
  )
    return "postponed";
  return "scheduled";
}

function toMatch(
  event: SportsDbEvent,
  stats: Map<string, TeamStats>,
): MatchSummary {
  return {
    id: `sportsdb-${event.idEvent}`,
    providerFixtureId: event.idAPIfootball ?? event.idEvent ?? undefined,
    startsAt: normalizeSportsDbTimestamp(event),
    matchday: event.intRound ? `Jornada ${event.intRound}` : "Liga MX",
    venue: event.strVenue ?? "Por confirmar",
    status: matchStatus(event),
    home: parseTeam(event, "Home", stats),
    away: parseTeam(event, "Away", stats),
    sources: ["thesportsdb"],
    dataFreshness: "Calendario y resultados de TheSportsDB",
  };
}

export const sportsDbProvider = {
  enabled: () => Boolean(env.sportsDbApiKey && env.sportsDbLigaMxId),

  async upcoming(): Promise<MatchSummary[]> {
    const events = await fetchSeason();
    const stats = buildStats(events);
    const now = Date.now() - 3 * 60 * 60_000;
    return events
      .filter(
        (event) =>
          !isFinished(event) &&
          new Date(normalizeSportsDbTimestamp(event)).getTime() >= now,
      )
      .map((event) => toMatch(event, stats))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  },

  async context(match: MatchSummary): Promise<Partial<AnalysisInput>> {
    const events = await fetchSeason();
    const completed = events.filter(isFinished);
    const homeId = String(match.home.providerId ?? "");
    const awayId = String(match.away.providerId ?? "");
    const history: HeadToHeadItem[] = completed
      .filter(
        (event) =>
          [event.idHomeTeam, event.idAwayTeam].includes(homeId) &&
          [event.idHomeTeam, event.idAwayTeam].includes(awayId),
      )
      .slice(-5)
      .reverse()
      .map((event) => ({
        date: normalizeSportsDbTimestamp(event).slice(0, 10),
        home: event.strHomeTeam ?? "Local",
        away: event.strAwayTeam ?? "Visitante",
        homeScore: Number(event.intHomeScore ?? 0),
        awayScore: Number(event.intAwayScore ?? 0),
      }));
    const restDays = (lastMatchAt?: string) =>
      lastMatchAt
        ? Math.max(
            0,
            Math.floor(
              (new Date(match.startsAt).getTime() -
                new Date(lastMatchAt).getTime()) /
                86_400_000,
            ),
          )
        : 0;
    return {
      headToHead: history,
      restDays: {
        home: restDays(match.home.lastMatchAt),
        away: restDays(match.away.lastMatchAt),
      },
      coverage: {
        standings: match.home.matchesPlayed > 0 || match.away.matchesPlayed > 0,
        form: match.home.form.length > 0 || match.away.form.length > 0,
        availability: false,
        headToHead: history.length > 0,
        weather: Boolean(match.weather),
      },
    };
  },
};
