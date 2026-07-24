import assert from "node:assert/strict";
import test from "node:test";

import {
  hashSessionToken,
  normalizeDisplayName,
  normalizeEmail,
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

test("validates capture input", () => {
  assert.equal(isModuleKey("notes"), true);
  assert.equal(isModuleKey("unknown"), false);
  assert.equal(normalizeCaptureContent("  Una   idea nueva  "), "Una idea nueva");
  assert.equal(normalizeCaptureContent("x"), null);
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

test("normalizes identity and hashes session tokens", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  assert.equal(normalizeEmail("invalid"), null);
  assert.equal(
    normalizeDisplayName("  Adrián   Rodríguez ", "user@example.com"),
    "Adrián Rodríguez",
  );
  assert.equal(hashSessionToken("token"), hashSessionToken("token"));
  assert.notEqual(hashSessionToken("token"), hashSessionToken("other-token"));
});
