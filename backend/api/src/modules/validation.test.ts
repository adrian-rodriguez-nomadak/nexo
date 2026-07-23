import assert from "node:assert/strict";
import test from "node:test";

import {
  hashSessionToken,
  normalizeDisplayName,
  normalizeEmail,
} from "./auth/auth.utils.js";
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

test("validates capture input", () => {
  assert.equal(isModuleKey("notes"), true);
  assert.equal(isModuleKey("unknown"), false);
  assert.equal(normalizeCaptureContent("  Una   idea nueva  "), "Una idea nueva");
  assert.equal(normalizeCaptureContent("x"), null);
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
