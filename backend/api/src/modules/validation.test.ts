import assert from "node:assert/strict";
import test from "node:test";

import {
  hashSessionToken,
  normalizeDisplayName,
  normalizeEmail,
} from "./auth/auth.utils.js";
import {
  betPayoutCents,
  isBetStatus,
  isValidBetCents,
  normalizeBetDate,
  normalizeBetOdds,
  normalizeBetText,
} from "./bets/bets.validation.js";
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
