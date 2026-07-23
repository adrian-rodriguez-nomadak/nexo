import { env } from "../../../config/env.js";
import type { MatchSummary, TeamSummary } from "../sports.types.js";

type SportsDbEvent = Record<string, string | null>;

function parseTeam(event: SportsDbEvent, side: "Home" | "Away"): TeamSummary {
  const name = event[`str${side}Team`] ?? "Equipo";
  const badge = event[`str${side}TeamBadge`];
  return {
    id: `sportsdb-team-${event[`id${side}Team`] ?? name.toLowerCase().replace(/\W+/g, "-")}`,
    providerId: event[`id${side}Team`] ?? undefined,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    logoUrl: badge ?? undefined,
    position: 0,
    points: 0,
    form: [],
    formLabel: "Sin racha",
    goalsForAverage: 1.35,
    goalsAgainstAverage: 1.25,
    homeAwayStrength: side === "Home" ? 0.62 : 0.55,
    unavailablePlayers: 0,
  };
}

export const sportsDbProvider = {
  enabled: () => Boolean(env.sportsDbApiKey && env.sportsDbLigaMxId),

  async upcoming(): Promise<MatchSummary[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${env.sportsDbApiKey}/eventsnextleague.php?id=${env.sportsDbLigaMxId}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(`TheSportsDB responded ${response.status}`);
      const payload = (await response.json()) as {
        events?: SportsDbEvent[] | null;
      };
      return (payload.events ?? []).map((event) => ({
        id: `sportsdb-${event.idEvent}`,
        providerFixtureId: event.idEvent ?? undefined,
        startsAt:
          event.strTimestamp ??
          `${event.dateEvent}T${event.strTime ?? "12:00:00"}Z`,
        matchday: event.intRound ? `Jornada ${event.intRound}` : "Liga MX",
        venue: event.strVenue ?? "Por confirmar",
        status: "scheduled",
        home: parseTeam(event, "Home"),
        away: parseTeam(event, "Away"),
        sources: ["thesportsdb"],
        dataFreshness: "Actualizado desde TheSportsDB",
      }));
    } finally {
      clearTimeout(timeout);
    }
  },
};
