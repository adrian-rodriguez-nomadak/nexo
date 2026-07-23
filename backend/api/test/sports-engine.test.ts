import assert from "node:assert/strict";
import test from "node:test";

import { demoContext } from "../src/modules/sports/demo.data.js";
import { normalizeSportsDbTimestamp } from "../src/modules/sports/providers/thesportsdb.provider.js";
import {
  analyzeBetRisk,
  analyzeMatch,
} from "../src/modules/sports/sports.engine.js";

test("interprets TheSportsDB timestamps as UTC before showing Monterrey time", () => {
  const timestamp = normalizeSportsDbTimestamp({
    strTimestamp: "2026-07-25T03:00:00",
  });
  const local = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Monterrey",
  }).format(new Date(timestamp));

  assert.equal(timestamp, "2026-07-25T03:00:00Z");
  assert.match(local, /2026-07-24.*21:00/);
});

test("match probabilities add up to 100 and expose supported markets", () => {
  const analysis = analyzeMatch(demoContext("demo-santos-tigres"));

  assert.equal(
    analysis.probabilities.homeWin +
      analysis.probabilities.draw +
      analysis.probabilities.awayWin,
    100,
  );
  assert.ok(analysis.goals.over1_5 >= analysis.goals.over2_5);
  assert.ok(analysis.confidence >= 45 && analysis.confidence <= 82);
  assert.equal(analysis.modelVersion, "liga-mx-hybrid-v1");
  assert.ok(analysis.keyFactors.length >= 3);
});

test("risk engine penalizes excessive bankroll exposure and parlays", () => {
  const result = analyzeBetRisk({
    bookmaker: "Caliente",
    stake: 500,
    bankroll: 10_000,
    totalOdds: 3.4,
    betType: "parlay",
    confirmed: true,
    selections: [
      {
        match: "Santos Laguna vs Tigres UANL",
        market: "Doble oportunidad",
        selection: "Tigres o empate",
        odds: 1.42,
        estimatedProbability: 74,
      },
      {
        match: "Club América vs Toluca",
        market: "Total de goles",
        selection: "Más de 2.5",
        odds: 2.1,
        estimatedProbability: 51,
      },
    ],
  });

  assert.equal(result.bankrollExposure, 5);
  assert.ok(result.riskScore >= 60);
  assert.ok(result.recommendedMaximumStake <= 200);
  assert.ok(result.warnings.some((warning) => warning.includes("bankroll")));
});

test("risk engine requires explicit ticket confirmation", () => {
  assert.throws(
    () =>
      analyzeBetRisk({
        stake: 100,
        bankroll: 10_000,
        totalOdds: 1.5,
        betType: "single",
        confirmed: false,
        selections: [
          { match: "A vs B", market: "Ganador", selection: "A", odds: 1.5 },
        ],
      }),
    /confirmarse/,
  );
});
