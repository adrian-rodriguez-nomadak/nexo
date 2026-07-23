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

async function suggestedParlay(
  profile: NonNullable<BetTicket["recommendationProfile"]> = "conservative",
  maxTotalOdds = 3,
) {
  const settings = {
    very_conservative: { minimumProbability: 70, maximumSelections: 3 },
    conservative: { minimumProbability: 63, maximumSelections: 5 },
    balanced: { minimumProbability: 57, maximumSelections: 7 },
  }[profile];
  const loaded = await loadOverview();
  const candidates = await Promise.all(
    loaded.matches.slice(0, 8).map(async (match) => {
      const context = await sportsService.context(match.id);
      if (!context) return null;
      const analysis = analyzeMatch(context);
      const safest = [...analysis.saferMarkets]
        .filter(
          (item) =>
            item.risk !== "high" &&
            item.probability >= settings.minimumProbability,
        )
        .sort((left, right) => right.probability - left.probability)[0];
      if (!safest) return null;
      const isDoubleChance = safest.market.includes(" o empate");
      const favoriteIsHome = safest.market.startsWith(match.home.name);
      const market = isDoubleChance ? "Doble oportunidad" : "Total de goles";
      const selection = isDoubleChance
        ? favoriteIsHome
          ? "Local o empate"
          : "Empate o visitante"
        : "Más de 1.5 goles";
      const realOdds =
        match.providerFixtureId && apiFootballProvider.enabled()
          ? await apiFootballProvider.conservativeOdds(
              Number(match.providerFixtureId),
              selection,
            )
          : null;
      const simulatedOdds = Math.max(
        1.1,
        Math.round((0.94 / (safest.probability / 100)) * 100) / 100,
      );
      return {
        matchId: match.id,
        match: `${match.home.name} vs ${match.away.name}`,
        market,
        selection,
        probability: safest.probability,
        odds: realOdds?.odds ?? simulatedOdds,
        oddsSource: realOdds ? ("api-football" as const) : ("simulated" as const),
        bookmaker: realOdds?.bookmaker,
      };
    }),
  );
  const ranked = candidates
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.probability - left.probability);
  const selections: typeof ranked = [];
  let accumulatedOdds = 1;
  for (const candidate of ranked) {
    if (selections.length >= settings.maximumSelections) break;
    if (accumulatedOdds * candidate.odds > maxTotalOdds) continue;
    selections.push(candidate);
    accumulatedOdds *= candidate.odds;
  }
  if (selections.length < 2) return undefined;
  const totalOdds =
    Math.round(
      selections.reduce((total, selection) => total * selection.odds, 1) * 100,
    ) / 100;
  const estimatedProbability =
    Math.round(
      selections.reduce(
        (total, selection) => total * (selection.probability / 100),
        1,
      ) *
        Math.pow(0.97, selections.length - 1) *
        10000,
    ) / 100;
  const realCount = selections.filter(
    (selection) => selection.oddsSource === "api-football",
  ).length;
  return {
    selections,
    totalOdds,
    estimatedProbability,
    oddsSource:
      realCount === selections.length
        ? ("real" as const)
        : realCount
          ? ("mixed" as const)
          : ("simulated" as const),
    note:
      "Propuesta informativa de menor riesgo relativo; una combinada nunca es una apuesta segura.",
  };
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
  const enriched: MatchSummary[] = [];
  for (const [index, rawMatch] of matches.entries()) {
    const match = enrichMatchVenue(rawMatch);
    const forecast = await getMatchWeather(match).catch(() => undefined);
    enriched.push({
      ...match,
      weather:
        forecast ??
        (match.sources.includes("demo") ? demoWeather(index) : undefined),
      sources: forecast
        ? Array.from(new Set([...match.sources, "open-meteo" as const]))
        : match.sources,
    });
  }
  return enriched;
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
    const [apiContext, sportsDbContext] = await Promise.all([
      match.sources.includes("api-football")
        ? apiFootballProvider
            .context(match)
            .catch(() => ({}) as Partial<AnalysisInput>)
        : Promise.resolve({} as Partial<AnalysisInput>),
      match.sources.includes("thesportsdb")
        ? sportsDbProvider
            .context(match)
            .catch(() => ({}) as Partial<AnalysisInput>)
        : Promise.resolve({} as Partial<AnalysisInput>),
    ]);
    const availability = [
      ...(apiContext.availability ?? []),
      ...(sportsDbContext.availability ?? []),
    ];
    const headToHead = apiContext.headToHead?.length
      ? apiContext.headToHead
      : (sportsDbContext.headToHead ?? []);
    return {
      match,
      availability,
      headToHead,
      restDays: sportsDbContext.restDays ??
        apiContext.restDays ?? { home: 0, away: 0 },
      coverage: {
        standings: Boolean(
          apiContext.coverage?.standings || sportsDbContext.coverage?.standings,
        ),
        form: Boolean(
          apiContext.coverage?.form || sportsDbContext.coverage?.form,
        ),
        availability: Boolean(
          apiContext.coverage?.availability ||
          sportsDbContext.coverage?.availability,
        ),
        headToHead: headToHead.length > 0,
        weather: Boolean(match.weather),
      },
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
    const recommendation = await suggestedParlay(
      ticket.recommendationProfile,
      ticket.maxSuggestedOdds,
    );
    const saved = await sportsRepository.saveBetAnalysis(
      normalizedTicket,
      result,
    );
    return {
      ...result,
      suggestedParlay: recommendation,
      assessedSelections: enriched.assessedSelections,
      analysisId: saved.id,
    };
  },

  history(limit: number) {
    return sportsRepository.history(limit);
  },
};
