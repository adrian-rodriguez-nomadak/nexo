import type {
  AnalysisInput,
  BetRiskAnalysis,
  BetTicket,
  MatchAnalysis,
} from "./sports.types.js";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const round = (value: number, digits = 0) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const average = (values: number[], fallback = 0) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;

function formScore(form: string[]) {
  const values = form
    .slice(-5)
    .map((item) => (item === "W" ? 1 : item === "D" ? 0.5 : 0));
  return average(values, 0.5);
}

function poissonAtLeast(lambda: number, threshold: number) {
  let cumulative = 0;
  for (let goals = 0; goals <= threshold; goals += 1) {
    cumulative += (Math.exp(-lambda) * lambda ** goals) / factorial(goals);
  }
  return 1 - cumulative;
}

function factorial(value: number) {
  let result = 1;
  for (let current = 2; current <= value; current += 1) result *= current;
  return result;
}

function resultLabel(
  home: number,
  draw: number,
  away: number,
  homeName: string,
  awayName: string,
) {
  if (draw >= home && draw >= away)
    return `El empate conserva el mayor peso, con un partido de márgenes pequeños.`;
  const favorite = home > away ? homeName : awayName;
  return `${favorite} parte con ventaja, aunque el margen no elimina el riesgo de empate.`;
}

export function analyzeMatch(input: AnalysisInput): MatchAnalysis {
  const { match, availability, headToHead, restDays } = input;
  const homeForm = formScore(match.home.form);
  const awayForm = formScore(match.away.form);
  const formDelta = homeForm - awayForm;
  const homeAwayDelta =
    match.home.homeAwayStrength - match.away.homeAwayStrength;
  const attackDelta =
    match.home.goalsForAverage -
    match.home.goalsAgainstAverage -
    (match.away.goalsForAverage - match.away.goalsAgainstAverage);
  const tableDelta = clamp(
    (match.away.position - match.home.position) / 17,
    -1,
    1,
  );
  const h2hHomePoints = headToHead.map((item) => {
    const homeIsInputHome = item.home === match.home.name;
    const inputHomeScore = homeIsInputHome ? item.homeScore : item.awayScore;
    const inputAwayScore = homeIsInputHome ? item.awayScore : item.homeScore;
    return inputHomeScore > inputAwayScore
      ? 1
      : inputHomeScore === inputAwayScore
        ? 0.5
        : 0;
  });
  const h2hDelta = (average(h2hHomePoints, 0.5) - 0.5) * 2;
  const homeUnavailable = availability.filter(
    (item) => item.teamId === match.home.id,
  ).length;
  const awayUnavailable = availability.filter(
    (item) => item.teamId === match.away.id,
  ).length;
  const availabilityDelta = clamp(
    (awayUnavailable - homeUnavailable) / 4,
    -1,
    1,
  );
  const restDelta = clamp((restDays.home - restDays.away) / 7, -1, 1);
  const weatherPenalty =
    match.weather?.impact === "high"
      ? -0.16
      : match.weather?.impact === "medium"
        ? -0.07
        : 0;

  const factorScores = {
    recentForm: round(formDelta, 3),
    homeAwayPerformance: round(homeAwayDelta, 3),
    goalsForAgainst: round(clamp(attackDelta / 2.5, -1, 1), 3),
    tablePosition: round(tableDelta, 3),
    headToHead: round(h2hDelta, 3),
    playerAvailability: round(availabilityDelta, 3),
    restDays: round(restDelta, 3),
    weather: weatherPenalty,
  };

  const edge =
    factorScores.recentForm * 0.24 +
    factorScores.homeAwayPerformance * 0.19 +
    factorScores.goalsForAgainst * 0.18 +
    factorScores.tablePosition * 0.1 +
    factorScores.headToHead * 0.09 +
    factorScores.playerAvailability * 0.1 +
    factorScores.restDays * 0.05 +
    0.09;
  const drawBase = clamp(
    0.3 - Math.abs(edge) * 0.12 + (weatherPenalty < 0 ? 0.025 : 0),
    0.22,
    0.34,
  );
  const remaining = 1 - drawBase;
  const homeShare = 1 / (1 + Math.exp(-edge * 3.25));
  const homeWin = round(remaining * homeShare * 100);
  const draw = round(drawBase * 100);
  const awayWin = 100 - homeWin - draw;

  const expectedHomeGoals = clamp(
    (match.home.goalsForAverage + match.away.goalsAgainstAverage) / 2 +
      0.12 +
      weatherPenalty,
    0.35,
    2.6,
  );
  const expectedAwayGoals = clamp(
    (match.away.goalsForAverage + match.home.goalsAgainstAverage) / 2 +
      weatherPenalty,
    0.3,
    2.5,
  );
  const expectedTotal = expectedHomeGoals + expectedAwayGoals;
  const over15 = round(poissonAtLeast(expectedTotal, 1) * 100);
  const over25 = round(poissonAtLeast(expectedTotal, 2) * 100);
  const btts = round(
    (1 - Math.exp(-expectedHomeGoals)) *
      (1 - Math.exp(-expectedAwayGoals)) *
      100,
  );

  const sourceCoverage = clamp(
    match.sources.filter((source) => source !== "demo").length / 3,
    0,
    1,
  );
  const dataSignals =
    Math.min(match.home.form.length, 5) +
    Math.min(match.away.form.length, 5) +
    Math.min(headToHead.length, 5) +
    Math.min(availability.length, 4);
  const uncertaintyPenalty = Math.abs(homeWin - awayWin) < 8 ? 3 : 0;
  const confidence = round(
    clamp(
      48 + dataSignals * 1.15 + sourceCoverage * 11 - uncertaintyPenalty,
      45,
      82,
    ),
  );

  const factors = [
    {
      label: `Racha reciente: ${match.home.formLabel} vs ${match.away.formLabel}`,
      weight: Math.abs(formDelta),
    },
    {
      label: `Localía y rendimiento fuera de casa`,
      weight: Math.abs(homeAwayDelta),
    },
    {
      label: `Balance ofensivo y defensivo`,
      weight: Math.abs(attackDelta) / 2,
    },
    {
      label: `${availability.length} baja${availability.length === 1 ? "" : "s"} reportada${availability.length === 1 ? "" : "s"}`,
      weight: availability.length / 4,
    },
    {
      label: `Clima previsto: ${match.weather?.label ?? "sin impacto relevante"}`,
      weight: Math.abs(weatherPenalty) * 4,
    },
  ].sort((a, b) => b.weight - a.weight);

  const favorite = homeWin >= awayWin ? match.home.name : match.away.name;
  const saferMarkets = [
    {
      market: "Más de 1.5 goles",
      probability: over15,
      risk: over15 >= 70 ? "low" : over15 >= 58 ? "medium" : "high",
    },
    {
      market: `${favorite} o empate`,
      probability: (homeWin >= awayWin ? homeWin : awayWin) + draw,
      risk: "low",
    },
    {
      market: "Ambos equipos anotan",
      probability: btts,
      risk: btts >= 62 ? "medium" : "high",
    },
    {
      market: "Más de 2.5 goles",
      probability: over25,
      risk: over25 >= 60 ? "medium" : "high",
    },
  ] as MatchAnalysis["saferMarkets"];

  return {
    matchId: match.id,
    generatedAt: new Date().toISOString(),
    modelVersion: "liga-mx-hybrid-v1",
    probabilities: { homeWin, draw, awayWin },
    goals: {
      over1_5: over15,
      over2_5: over25,
      bothTeamsScore: btts,
      expectedTotal: round(expectedTotal, 2),
    },
    confidence,
    expectedScenario: resultLabel(
      homeWin,
      draw,
      awayWin,
      match.home.name,
      match.away.name,
    ),
    summary: `${favorite} llega con la lectura estadística más favorable. El modelo espera ${round(expectedTotal, 1)} goles y mantiene ${draw}% de probabilidad de empate; conviene revisar alineaciones cerca del inicio.`,
    keyFactors: factors.slice(0, 4).map((item) => item.label),
    uncertainties: [
      "Las alineaciones oficiales pueden modificar el peso de las bajas.",
      "Liga MX mantiene alta variabilidad entre jornadas.",
      ...(match.weather
        ? []
        : ["Aún no hay un pronóstico meteorológico asociado al estadio."]),
    ],
    saferMarkets,
    factorScores,
  };
}

export function analyzeBetRisk(ticket: BetTicket): BetRiskAnalysis {
  if (!ticket.confirmed)
    throw new Error("El boleto debe confirmarse antes de analizar el riesgo.");
  const impliedProbability = 100 / ticket.totalOdds;
  const selectionProbabilities = ticket.selections.map(
    (selection) =>
      clamp(selection.estimatedProbability ?? 100 / selection.odds - 4, 4, 96) /
      100,
  );
  const correlationPenalty =
    ticket.selections.length > 1
      ? Math.pow(0.97, ticket.selections.length - 1)
      : 1;
  const estimatedProbability =
    selectionProbabilities.reduce(
      (value, probability) => value * probability,
      1,
    ) *
    100 *
    correlationPenalty;
  const exposure = (ticket.stake / ticket.bankroll) * 100;
  const expectedValue =
    (estimatedProbability / 100) * ticket.totalOdds * ticket.stake -
    ticket.stake;
  const edge = estimatedProbability - impliedProbability;
  const combinationRisk = Math.max(0, ticket.selections.length - 1) * 9;
  const exposureRisk = clamp(exposure * 8, 0, 45);
  const priceRisk = clamp(-edge * 2.1, -14, 30);
  const riskScore = round(
    clamp(26 + combinationRisk + exposureRisk + priceRisk, 0, 100),
  );
  const riskLevel =
    riskScore >= 80
      ? "critical"
      : riskScore >= 60
        ? "high"
        : riskScore >= 35
          ? "medium"
          : "low";
  const conservativeFraction =
    edge > 0
      ? clamp(
          (((estimatedProbability / 100) * ticket.totalOdds - 1) /
            (ticket.totalOdds - 1)) *
            0.25,
          0.005,
          0.02,
        )
      : 0.01;
  const recommendedMaximumStake = round(
    Math.min(ticket.bankroll * conservativeFraction, ticket.bankroll * 0.02),
    2,
  );

  const warnings: string[] = [];
  if (exposure > 2)
    warnings.push(
      `La apuesta representa ${round(exposure, 1)}% del bankroll; el límite conservador es 2%.`,
    );
  if (edge < 0)
    warnings.push(
      "La probabilidad estimada es menor que la exigida por la cuota.",
    );
  if (ticket.selections.length > 1)
    warnings.push(
      `La combinada depende de ${ticket.selections.length} selecciones; una sola pérdida invalida el boleto.`,
    );
  if (ticket.selections.length >= 4)
    warnings.push(
      "Cuatro o más selecciones elevan fuertemente la incertidumbre acumulada.",
    );

  const decision =
    edge < -5
      ? "not_recommended"
      : ticket.stake > recommendedMaximumStake * 2
        ? "not_recommended_at_requested_amount"
        : ticket.stake > recommendedMaximumStake
          ? "reduce_stake"
          : "reasonable";

  return {
    riskScore,
    riskLevel,
    requestedStake: ticket.stake,
    bankroll: ticket.bankroll,
    bankrollExposure: round(exposure, 2),
    impliedProbability: round(impliedProbability, 2),
    estimatedProbability: round(estimatedProbability, 2),
    expectedValue: round(expectedValue, 2),
    recommendedMaximumStake,
    decision,
    warnings,
    summary:
      decision === "reasonable"
        ? "El monto está dentro del rango conservador, aunque ninguna apuesta elimina la incertidumbre."
        : decision === "reduce_stake"
          ? "La lectura puede tener sentido, pero el monto debería reducirse para proteger el bankroll."
          : decision === "not_recommended_at_requested_amount"
            ? "La combinación puede cumplirse, pero el monto solicitado expone demasiado bankroll."
            : "La cuota y la incertidumbre no compensan el riesgo; no se recomienda jugarlo en estas condiciones.",
  };
}
