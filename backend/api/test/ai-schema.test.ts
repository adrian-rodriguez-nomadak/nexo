import assert from "node:assert/strict";
import test from "node:test";

import {
  interpretationSchema,
  interpretedActionSchema,
} from "../src/modules/ai/ai.service.js";

const emptyPayload = {
  type: null,
  amount: null,
  description: null,
  movement_date: null,
  payment_method: null,
  due_date: null,
  priority: null,
  remind_at: null,
  repeat_type: null,
  start_at: null,
  end_at: null,
  location_name: null,
  name: null,
  debt_type: null,
  total_amount: null,
  billing_day: null,
  frequency: null,
  category: null,
  notes: null,
};

test("accepts a structured expense interpretation", () => {
  const result = interpretedActionSchema.parse({
    intent: "create_expense",
    title: "Comida",
    preview: "Propone registrar un gasto para confirmación.",
    confidence: 0.94,
    payload: {
      ...emptyPayload,
      type: "expense",
      amount: 180,
      description: "Comida",
    },
  });

  assert.equal(result.payload.amount, 180);
});

test("rejects unknown intents and invalid confidence", () => {
  const result = interpretedActionSchema.safeParse({
    intent: "delete_everything",
    title: "Acción peligrosa",
    preview: "",
    confidence: 2,
    payload: emptyPayload,
  });

  assert.equal(result.success, false);
});

test("supports multiple independent actions in one interpretation", () => {
  const result = interpretationSchema.parse({
    actions: [
      {
        intent: "create_event",
        title: "Ir al gimnasio",
        preview: "Propone crear un evento.",
        confidence: 0.95,
        payload: { ...emptyPayload, start_at: "2026-07-14T18:00:00-06:00" },
      },
      {
        intent: "create_expense",
        title: "Mensualidad del gimnasio",
        preview: "Propone registrar un gasto.",
        confidence: 0.98,
        payload: { ...emptyPayload, type: "expense", amount: 600 },
      },
    ],
  });

  assert.equal(result.actions.length, 2);
});
