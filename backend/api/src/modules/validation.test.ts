import assert from "node:assert/strict";
import test from "node:test";

import {
  hashSessionToken,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
} from "./auth/auth.utils.js";
import {
  betPayoutCents,
  combinedBetOdds,
  isBetStatus,
  isSportsbook,
  isValidBetCents,
  normalizeBetDate,
  normalizeBetOdds,
  normalizeBetSelections,
  normalizeBetText,
  resolveBetOdds,
} from "./bets/bets.validation.js";
import { isValidBetImageDataUrl } from "./bets/bets.image.js";
import { isValidObserverImageDataUrl } from "./observer/observer.analysis.js";
import {
  isObserverSubmodule,
  normalizeObserverScopes,
  scopesForModules,
} from "./observer/observer.scopes.js";
import {
  isMemoryKind,
  isMemorySensitivity,
  normalizeMemoryConfidence,
  normalizeMemoryContent,
  normalizeSourceRecordIds,
} from "./memories/memories.validation.js";
import {
  isModuleKey,
  normalizeCaptureContent,
} from "./captures/captures.validation.js";
import {
  isAccountType,
  isTransactionKind,
  isValidCents,
  normalizeLabel,
  normalizeOccurredAt,
} from "./finances/finances.validation.js";
import {
  isValidEventRange,
  normalizeEventDate,
  normalizeEventText,
  normalizeOptionalEventText,
} from "./events/events.validation.js";
import {
  normalizeNoteContent,
  normalizeNoteTags,
  normalizeNoteTitle,
} from "./notes/notes.validation.js";
import {
  isMealType,
  normalizeMealDate,
  normalizeMealText,
  normalizeOptionalMealDecimal,
  normalizeOptionalMealInteger,
} from "./meals/meals.validation.js";
import {
  normalizeExercises,
  normalizeGymDate,
  normalizeGymText,
} from "./gym/gym.validation.js";
import { searchExerciseCatalog } from "./gym/gym.catalog.js";
import {
  hasHealthValue,
  isBiologicalSex,
  isBloodType,
  normalizeHealthDate,
  normalizeHealthDecimal,
  normalizeHealthInteger,
  normalizeHealthList,
} from "./health/health.validation.js";
import { searchFoodCatalog } from "./meals/meals.catalog.js";
import { normalizeProgressDays } from "./progress/progress.validation.js";
import {
  buildAssistantHistory,
  extractAssistantText,
} from "./assistant/assistant.validation.js";

test("maps assistant history to valid Responses API content types", () => {
  assert.deepEqual(
    buildAssistantHistory([
      { role: "user", content: "Hola" },
      { role: "assistant", content: "¿Cómo te ayudo?" },
    ]),
    [
      {
        role: "user",
        content: [{ type: "input_text", text: "Hola" }],
      },
      {
        role: "assistant",
        content: [{ type: "output_text", text: "¿Cómo te ayudo?" }],
      },
    ],
  );
});

test("extracts visible assistant text from Responses API payloads", () => {
  assert.equal(
    extractAssistantText({
      output: [
        { type: "reasoning", content: [] },
        {
          type: "message",
          content: [{ type: "output_text", text: "Respuesta final" }],
        },
      ],
    }),
    "Respuesta final",
  );
  assert.equal(
    extractAssistantText({ output_text: "Respuesta directa" }),
    "Respuesta directa",
  );
});

test("validates capture input", () => {
  assert.equal(isModuleKey("notes"), true);
  assert.equal(isModuleKey("unknown"), false);
  assert.equal(normalizeCaptureContent("  Una   idea nueva  "), "Una idea nueva");
  assert.equal(normalizeCaptureContent("x"), null);
});

test("normalizes observer module and submodule scopes", () => {
  assert.equal(isObserverSubmodule("finances", "accounts"), true);
  assert.equal(isObserverSubmodule("finances", "sleep"), false);
  assert.deepEqual(
    normalizeObserverScopes([
      { module: "finances", submodule: "accounts" },
      { module: "finances", submodule: "accounts" },
      { module: "health", submodule: "sleep" },
      { module: "unknown", submodule: "other" },
    ]),
    [
      { module: "finances", submodule: "accounts" },
      { module: "health", submodule: "sleep" },
    ],
  );
  assert.equal(scopesForModules(["gym"])[1]?.submodule, "strength");
});

test("validates structured personal memories", () => {
  assert.equal(normalizeMemoryContent("  Prefiere entrenar temprano  "), "Prefiere entrenar temprano");
  assert.equal(normalizeMemoryContent(""), null);
  assert.equal(normalizeMemoryConfidence(0.7849), 0.785);
  assert.equal(normalizeMemoryConfidence(1.2), null);
  assert.equal(isMemoryKind("preference"), true);
  assert.equal(isMemoryKind("guess"), false);
  assert.equal(isMemorySensitivity("restricted"), true);
  assert.deepEqual(normalizeSourceRecordIds(["one", "one", "two"]), [
    "one",
    "two",
  ]);
});

test("validates bet input", () => {
  assert.equal(normalizeBetText("  Tigres   vs Rayados ", 160), "Tigres vs Rayados");
  assert.equal(normalizeBetOdds(1.8764), 1.876);
  assert.equal(normalizeBetOdds(1), null);
  assert.equal(isValidBetCents(25_000), true);
  assert.equal(isValidBetCents(0), false);
  assert.equal(isValidBetCents(0, { allowZero: true }), true);
  assert.equal(isBetStatus("won"), true);
  assert.equal(isBetStatus("cancelled"), false);
  assert.equal(isSportsbook("Caliente"), true);
  assert.equal(isSportsbook("Draftea"), true);
  assert.equal(isSportsbook("Otra casa"), false);
  const selections = normalizeBetSelections([
    {
      event: "Tigres vs Rayados",
      selection: "Tigres gana",
      market: "Resultado",
      decimalOdds: 1.8,
    },
    {
      event: "América vs Pumas",
      selection: "Más de 2.5 goles",
      market: "",
      decimalOdds: 1.5,
    },
  ]);
  assert.equal(selections?.length, 2);
  assert.equal(combinedBetOdds(selections ?? []), 2.7);
  assert.equal(normalizeBetSelections([selections?.[0]])?.length, 1);
  assert.equal(resolveBetOdds(selections ?? [], null), 2.7);
  assert.equal(
    resolveBetOdds(
      [
        {
          decimalOdds: null,
        },
      ],
      4.19,
    ),
    4.19,
  );
  const imageTicketSelections = normalizeBetSelections([
    {
      event: "TIJ vs LEO",
      selection: "Tijuana",
      market: "Gana",
      decimalOdds: null,
    },
    {
      event: "TIJ vs LEO",
      selection: "Más 2.5",
      market: "Goles totales",
      decimalOdds: null,
    },
    {
      event: "TIJ vs LEO",
      selection: "Más 7.5",
      market: "Tiros de esquina",
      decimalOdds: null,
    },
    {
      event: "TIJ vs LEO",
      selection: "Tijuana | Más 1.5",
      market: "Total de goles",
      decimalOdds: null,
    },
    {
      event: "TIJ vs LEO",
      selection: "León | Más 0.5",
      market: "Total de goles",
      decimalOdds: null,
    },
  ]);
  assert.equal(imageTicketSelections?.length, 5);
  assert.equal(resolveBetOdds(imageTicketSelections ?? [], 4.19), 4.19);
  assert.equal(
    isValidBetImageDataUrl("data:image/jpeg;base64,YWJjZA=="),
    true,
  );
  assert.equal(isValidBetImageDataUrl("data:text/plain;base64,YWJjZA=="), false);
  assert.equal(
    isValidObserverImageDataUrl("data:image/jpeg;base64,YWJjZA=="),
    true,
  );
  assert.equal(
    isValidObserverImageDataUrl("data:image/png;base64,YWJjZA=="),
    false,
  );
  assert.equal(betPayoutCents(10_000, 1.8, "won"), 18_000);
  assert.equal(betPayoutCents(10_000, 1.8, "void"), 10_000);
  assert.equal(betPayoutCents(10_000, 1.8, "lost"), null);
  assert.equal(
    normalizeBetDate("2026-07-24T18:00:00-06:00"),
    "2026-07-25T00:00:00.000Z",
  );
});

test("validates finance input", () => {
  assert.equal(isAccountType("bank"), true);
  assert.equal(isTransactionKind("expense"), true);
  assert.equal(isValidCents(10_500), true);
  assert.equal(isValidCents(-10), false);
  assert.equal(isValidCents(-10, { allowNegative: true }), true);
  assert.equal(normalizeLabel("  Cuenta   principal "), "Cuenta principal");
  assert.equal(
    normalizeOccurredAt("2026-07-23T12:00:00-06:00"),
    "2026-07-23T18:00:00.000Z",
  );
});

test("validates event input", () => {
  assert.equal(normalizeEventText("  Cita   médica ", 100), "Cita médica");
  assert.equal(normalizeEventText("x", 100), null);
  assert.equal(normalizeOptionalEventText("", 100), null);
  assert.equal(
    normalizeEventDate("2026-07-24T18:30:00-06:00"),
    "2026-07-25T00:30:00.000Z",
  );
  assert.equal(
    isValidEventRange(
      "2026-07-25T00:30:00.000Z",
      "2026-07-25T01:30:00.000Z",
    ),
    true,
  );
  assert.equal(
    isValidEventRange(
      "2026-07-25T01:30:00.000Z",
      "2026-07-25T00:30:00.000Z",
    ),
    false,
  );
});

test("validates note input", () => {
  assert.equal(normalizeNoteTitle("  Idea   principal "), "Idea principal");
  assert.equal(normalizeNoteTitle("x"), null);
  assert.equal(normalizeNoteContent("  Primera línea\nSegunda línea  "), "Primera línea\nSegunda línea");
  assert.deepEqual(
    normalizeNoteTags(["Trabajo", " Personal ", "trabajo"]),
    ["Trabajo", "Personal"],
  );
  assert.equal(
    normalizeNoteTags([
      "uno",
      "dos",
      "tres",
      "cuatro",
      "cinco",
      "seis",
      "siete",
      "ocho",
      "nueve",
    ]),
    null,
  );
});

test("validates meal input", () => {
  assert.equal(isMealType("breakfast"), true);
  assert.equal(isMealType("brunch"), false);
  assert.equal(normalizeMealText("  Pollo   con arroz ", 160), "Pollo con arroz");
  assert.equal(normalizeOptionalMealInteger(650, 20_000), 650);
  assert.equal(normalizeOptionalMealInteger(-1, 20_000), null);
  assert.equal(normalizeOptionalMealDecimal(42.26, 2_000), 42.3);
  assert.equal(
    normalizeMealDate("2026-07-24T14:30:00-06:00"),
    "2026-07-24T20:30:00.000Z",
  );
});

test("validates gym input", () => {
  assert.equal(normalizeGymText("  Día   de pierna ", 120), "Día de pierna");
  const exercises = normalizeExercises([
    {
      name: "Sentadilla",
      kind: "strength",
      sets: 4,
      reps: 8,
      weightKg: 80,
      distanceKm: null,
      durationMinutes: null,
      notes: "",
    },
    {
      name: "Caminadora",
      kind: "cardio",
      sets: null,
      reps: null,
      weightKg: null,
      distanceKm: 3.25,
      durationMinutes: 20,
      notes: null,
    },
  ]);
  assert.equal(exercises?.length, 2);
  assert.equal(exercises?.[1]?.distanceKm, 3.25);
  assert.equal(
    normalizeExercises([
      {
        name: "Press",
        kind: "strength",
        sets: null,
        reps: 8,
      },
    ]),
    null,
  );
  assert.equal(
    normalizeGymDate("2026-07-24T18:00:00-06:00"),
    "2026-07-25T00:00:00.000Z",
  );
});

test("validates health profile and measurements", () => {
  assert.equal(isBiologicalSex("female"), true);
  assert.equal(isBiologicalSex("unknown"), false);
  assert.equal(isBloodType("O+"), true);
  assert.equal(isBloodType("C"), false);
  assert.deepEqual(
    normalizeHealthList([" Penicilina ", "Cacahuate", "penicilina"]),
    ["Penicilina", "Cacahuate"],
  );
  assert.equal(normalizeHealthList("Penicilina"), null);
  assert.equal(normalizeHealthDecimal(72.26, 20, 500), 72.3);
  assert.equal(normalizeHealthDecimal(19, 20, 500), null);
  assert.equal(normalizeHealthInteger(120, 50, 300), 120);
  assert.equal(normalizeHealthInteger(120.5, 50, 300), null);
  assert.equal(normalizeHealthDate("2020-02-29"), "2020-02-29");
  assert.equal(normalizeHealthDate("2021-02-29"), null);
  assert.equal(hasHealthValue(0), true);
  assert.equal(hasHealthValue(""), false);
});

test("normalizes progress periods", () => {
  assert.equal(normalizeProgressDays("7"), 7);
  assert.equal(normalizeProgressDays(7), 7);
  assert.equal(normalizeProgressDays("30"), 30);
  assert.equal(normalizeProgressDays("all"), 30);
});

test("normalizes exercise and food catalog responses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              id: 73,
              category: { name: "Chest" },
              translations: [
                { language: 2, name: "Bench Press" },
                { language: 4, name: "Press de Banca" },
              ],
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;
    assert.deepEqual(await searchExerciseCatalog("press"), [
      {
        id: "wger-73",
        name: "Press de Banca",
        category: "Chest",
        source: "wger",
      },
    ]);

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          products: [
            {
              code: "123",
              product_name: "Yogurt griego",
              brands: "Marca",
              nutriments: {
                "energy-kcal_100g": 120,
                proteins_100g: 10.4,
                carbohydrates_100g: 8,
                fat_100g: 4.2,
              },
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;
    assert.deepEqual(await searchFoodCatalog("yogurt"), [
      {
        id: "123",
        name: "Yogurt griego",
        brand: "Marca",
        caloriesPer100g: 120,
        proteinPer100g: 10.4,
        carbsPer100g: 8,
        fatPer100g: 4.2,
        source: "open-food-facts",
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes identity and hashes session tokens", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  assert.equal(normalizeEmail("invalid"), null);
  assert.equal(
    normalizeDisplayName("  Adrián   Rodríguez ", "user@example.com"),
    "Adrián Rodríguez",
  );
  assert.equal(hashSessionToken("token"), hashSessionToken("token"));
  assert.notEqual(hashSessionToken("token"), hashSessionToken("other-token"));
  assert.equal(normalizePassword("Nexo2026"), "Nexo2026");
  assert.equal(normalizePassword("sin-numeros"), null);
  assert.equal(normalizePassword("12345678"), null);
  assert.equal(normalizePassword("Con espacios 2026"), null);
});
