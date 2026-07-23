import { env } from "../../config/env.js";
import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { demoContext, demoMatches } from "./demo.data.js";
import { analyzeBetRisk, analyzeMatch } from "./sports.engine.js";
import { enrichMatchVenue } from "./liga-mx-venues.js";
import { apiFootballProvider } from "./providers/api-football.provider.js";
import { getMatchWeather } from "./providers/open-meteo.provider.js";
import { sportsDbProvider } from "./providers/thesportsdb.provider.js";
import { sportsRepository } from "./sports.repository.js";
import { ticketExtractionService } from "./ticket-extraction.service.js";
import type {
  AnalysisInput,
  BetTicket,
  MatchSummary,
  MatchWeather,
} from "./sports.types.js";

let overviewCache: {
  expiresAt: number;
  matches: MatchSummary[];
  errors: string[];
} | null = null;

function key(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\W+/g, "");
}

function sameMatch(left: MatchSummary, right: MatchSummary) {
  return (
    key(left.home.name) === key(right.home.name) &&
    key(left.away.name) === key(right.away.name) &&
    left.startsAt.slice(0, 10) === right.startsAt.slice(0, 10)
  );
}

function mergeMatches(primary: MatchSummary[], secondary: MatchSummary[]) {
  const merged = primary.map((item) => ({ ...item }));
  for (const candidate of secondary) {
    const existing = merged.find((item) => sameMatch(item, candidate));
    if (!existing) {
      merged.push(candidate);
      continue;
    }
    existing.sources = Array.from(
      new Set([...existing.sources, ...candidate.sources]),
    );
    existing.home.logoUrl ||= candidate.home.logoUrl;
    existing.away.logoUrl ||= candidate.away.logoUrl;
    existing.venue =
      existing.venue === "Por confirmar" ? candidate.venue : existing.venue;
  }
  return merged.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function demoWeather(index: number): MatchWeather {
  const presets = [
    {
      temperatureC: 31,
      precipitationProbability: 18,
      precipitationMm: 0,
      windKmh: 13,
      humidity: 42,
      weatherCode: 1,
      label: "cielo despejado",
      impact: "low" as const,
    },
    {
      temperatureC: 22,
      precipitationProbability: 58,
      precipitationMm: 1.2,
      windKmh: 15,
      humidity: 68,
      weatherCode: 61,
      label: "posible lluvia",
      impact: "medium" as const,
    },
    {
      temperatureC: 29,
      precipitationProbability: 25,
      precipitationMm: 0.1,
      windKmh: 19,
      humidity: 55,
      weatherCode: 2,
      label: "parcialmente nublado",
      impact: "low" as const,
    },
  ];
  return { ...presets[index % presets.length], source: "demo" };
}

function probabilityForSelection(
  selection: BetTicket["selections"][number],
  match: MatchSummary,
  analysis: ReturnType<typeof analyzeMatch>,
) {
  const market = key(selection.market);
  const pick = key(selection.selection);
  const home = key(match.home.name);
  const away = key(match.away.name);
  const mentionsHome =
    pick.includes(home) ||
    pick.includes(key(match.home.shortName)) ||
    pick === "local";
  const mentionsAway =
    pick.includes(away) ||
    pick.includes(key(match.away.shortName)) ||
    pick === "visitante";
  const mentionsDraw = pick.includes("empate") || pick === "x";

  if (market.includes("dobleoportunidad")) {
    if (mentionsHome && mentionsDraw)
      return analysis.probabilities.homeWin + analysis.probabilities.draw;
    if (mentionsAway && mentionsDraw)
      return analysis.probabilities.awayWin + analysis.probabilities.draw;
    if (mentionsHome && mentionsAway)
      return analysis.probabilities.homeWin + analysis.probabilities.awayWin;
  }
  if (market.includes("ambosequipos") || pick.includes("ambosanotan")) {
    return pick.includes("no")
      ? 100 - analysis.goals.bothTeamsScore
      : analysis.goals.bothTeamsScore;
  }
  if (
    market.includes("gol") ||
    market.includes("total") ||
    pick.includes("masde") ||
    pick.includes("menosde")
  ) {
    const over = pick.includes("mas") || pick.includes("over");
    const probability = pick.includes("15")
      ? analysis.goals.over1_5
      : analysis.goals.over2_5;
    return over ? probability : 100 - probability;
  }
  if (
    market.includes("ganador") ||
    market.includes("resultado") ||
    market.includes("1x2")
  ) {
    if (mentionsHome) return analysis.probabilities.homeWin;
    if (mentionsAway) return analysis.probabilities.awayWin;
    if (mentionsDraw) return analysis.probabilities.draw;
  }
  return undefined;
}

async function enrichTicketProbabilities(ticket: BetTicket) {
  const loaded = await loadOverview();
  const assessedSelections = await Promise.all(
    ticket.selections.map(async (selection) => {
      const selectionMatch = key(selection.match);
      const match = loaded.matches.find(
        (candidate) =>
          selectionMatch.includes(key(candidate.home.name)) &&
          selectionMatch.includes(key(candidate.away.name)),
      );
      if (!match)
        return {
          ...selection,
          probabilitySource: selection.estimatedProbability
            ? "manual"
            : "odds-fallback",
        };
      const context = await sportsService.context(match.id);
      if (!context)
        return {
          ...selection,
          probabilitySource: selection.estimatedProbability
            ? "manual"
            : "odds-fallback",
        };
      const analysis = analyzeMatch(context);
      const estimatedProbability = probabilityForSelection(
        selection,
        match,
        analysis,
      );
      return estimatedProbability == null
        ? {
            ...selection,
            probabilitySource: selection.estimatedProbability
              ? "manual"
              : "odds-fallback",
          }
        : {
            ...selection,
            estimatedProbability,
            probabilitySource: "nexo-match-model",
          };
    }),
  );
  return {
    ...ticket,
    selections: assessedSelections.map(
      ({ probabilitySource: _source, ...selection }) => selection,
    ),
    assessedSelections,
  };
}

async function attachWeather(matches: MatchSummary[]) {
  return Promise.all(
    matches.map(async (rawMatch, index) => {
      const match = enrichMatchVenue(rawMatch);
      const forecast = await getMatchWeather(match).catch(() => undefined);
      return {
        ...match,
        weather:
          forecast ??
          (match.sources.includes("demo") ? demoWeather(index) : undefined),
        sources: forecast
          ? Array.from(new Set([...match.sources, "open-meteo" as const]))
          : match.sources,
      };
    }),
  );
}

async function loadOverview() {
  if (overviewCache && overviewCache.expiresAt > Date.now())
    return overviewCache;
  const errors: string[] = [];
  const calls: Array<Promise<MatchSummary[]>> = [];
  if (apiFootballProvider.enabled())
    calls.push(
      apiFootballProvider.upcoming().catch((error: Error) => {
        errors.push(error.message);
        return [];
      }),
    );
  if (sportsDbProvider.enabled())
    calls.push(
      sportsDbProvider.upcoming().catch((error: Error) => {
        errors.push(error.message);
        return [];
      }),
    );
  const resultSets = await Promise.all(calls);
  let matches = resultSets.reduce(
    (current, result) => mergeMatches(current, result),
    [],
  );
  if (!matches.length && env.sportsDemoMode)
    matches = demoMatches.map((match) => ({ ...match }));
  matches = await attachWeather(matches.slice(0, 12));
  overviewCache = { expiresAt: Date.now() + 10 * 60_000, matches, errors };
  return overviewCache;
}

export const sportsService = {
  health() {
    return {
      ...moduleHealth("sports"),
      league: "Liga MX",
      providers: {
        apiFootball: apiFootballProvider.enabled(),
        theSportsDb: sportsDbProvider.enabled(),
        openMeteo: true,
        ticketVision: ticketExtractionService.configured(),
      },
      demoMode: env.sportsDemoMode,
    };
  },

  async overview() {
    const loaded = await loadOverview();
    return {
      league: {
        name: "Liga MX",
        season: env.apiFootballSeason,
        country: "México",
        coverage: [
          "fixtures",
          "standings",
          "form",
          "injuries",
          "players",
          "odds",
          "weather",
          "history",
        ],
      },
      currentMatchday: loaded.matches[0]?.matchday ?? "Próximos partidos",
      matches: loaded.matches,
      sourceStatus: {
        mode: loaded.matches.some((match) => match.sources.includes("demo"))
          ? "demo"
          : "live",
        errors: loaded.errors,
        providers: this.health().providers,
      },
    };
  },

  async context(id: string): Promise<AnalysisInput | null> {
    if (id.startsWith("demo-")) {
      const context = demoContext(id);
      const loaded = await loadOverview();
      const enriched = loaded.matches.find(
        (match) => match.id === context.match.id,
      );
      if (enriched) context.match = enriched;
      return context;
    }
    const loaded = await loadOverview();
    const match = loaded.matches.find((item) => item.id === id);
    if (!match) return null;
    const providerContext: Partial<AnalysisInput> = match.sources.includes(
      "api-football",
    )
      ? await apiFootballProvider.context(match).catch(() => ({}))
      : {};
    return {
      match,
      availability: providerContext.availability ?? [],
      headToHead: providerContext.headToHead ?? [],
      restDays: providerContext.restDays ?? { home: 6, away: 6 },
    };
  },

  async analyze(id: string) {
    const context = await this.context(id);
    if (!context) return null;
    const result = analyzeMatch(context);
    const saved = await sportsRepository.saveMatchAnalysis(id, context, result);
    return { ...result, analysisId: saved.id };
  },

  async extractTicket(imageDataUrl: string) {
    const extracted = await ticketExtractionService.extract(
      imageDataUrl,
      requireUserId(),
    );
    if (!extracted) {
      return {
        configured: false,
        message:
          "Configura OPENAI_API_KEY para leer boletos. También puedes capturar los campos manualmente.",
        ticket: null,
      };
    }
    return { configured: true, ticket: extracted };
  },

  async analyzeBet(ticket: BetTicket) {
    const enriched = await enrichTicketProbabilities(ticket);
    const normalizedTicket: BetTicket = {
      ...ticket,
      selections: enriched.selections,
    };
    const result = analyzeBetRisk(normalizedTicket);
    const saved = await sportsRepository.saveBetAnalysis(
      normalizedTicket,
      result,
    );
    return {
      ...result,
      assessedSelections: enriched.assessedSelections,
      analysisId: saved.id,
    };
  },

  history(limit: number) {
    return sportsRepository.history(limit);
  },
};
