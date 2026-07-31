import assert from "node:assert/strict";
import test from "node:test";

import { parseAssistantResponse } from "./assistant.response.js";

test("parses and bounds structured assistant visual blocks", () => {
  const response = parseAssistantResponse(JSON.stringify({
    answer: "Este es tu resumen.",
    blocks: [
      {
        type: "bar_chart",
        title: "Gastos",
        points: [
          { label: "Comida", value: 1200 },
          { label: "Transporte", value: 500 },
        ],
        unit: "MXN",
      },
      { type: "progress", label: "Meta", value: 1.8 },
      { type: "unknown", arbitrary: true },
    ],
  }));

  assert.equal(response.answer, "Este es tu resumen.");
  assert.equal(response.blocks.length, 2);
  assert.deepEqual(response.blocks[1], {
    type: "progress",
    label: "Meta",
    value: 1,
    displayValue: undefined,
  });
});

test("keeps plain-text model replies as a compatible fallback", () => {
  assert.deepEqual(parseAssistantResponse("Respuesta normal"), {
    answer: "Respuesta normal",
    blocks: [],
  });
});
