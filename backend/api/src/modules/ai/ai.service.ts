import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "../../config/env.js";
import { moduleHealth } from "../../shared/utils/api-response.js";

const intentSchema = z.enum([
  "create_expense",
  "create_income",
  "create_task",
  "create_reminder",
  "create_event",
  "create_debt",
  "create_subscription",
  "note",
]);

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const interpretedActionSchema = z.object({
  intent: intentSchema,
  title: z.string(),
  preview: z.string(),
  confidence: z.number().min(0).max(1),
  payload: z.object({
    type: nullableString,
    amount: nullableNumber,
    description: nullableString,
    movement_date: nullableString,
    payment_method: nullableString,
    due_date: nullableString,
    priority: nullableString,
    remind_at: nullableString,
    repeat_type: nullableString,
    start_at: nullableString,
    end_at: nullableString,
    location_name: nullableString,
    name: nullableString,
    debt_type: nullableString,
    total_amount: nullableNumber,
    billing_day: nullableNumber,
    frequency: nullableString,
    category: nullableString,
    notes: nullableString,
  }),
});

export type InterpretedAction = z.infer<typeof interpretedActionSchema>;

const client =
  env.openAiApiKey === "change_me"
    ? null
    : new OpenAI({ apiKey: env.openAiApiKey, timeout: 20_000, maxRetries: 1 });

function safetyIdentifier(userId: string) {
  return createHash("sha256").update(`nexo:${userId}`).digest("hex");
}

function removeNulls(payload: InterpretedAction["payload"]) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null),
  );
}

export const aiService = {
  health() {
    return {
      ...moduleHealth("ai"),
      provider: "openai",
      configured: client !== null,
      model: env.openAiModel,
    };
  },

  async interpretAction(text: string, userId: string) {
    if (!client) return null;

    const response = await client.responses.parse({
      model: env.openAiModel,
      store: false,
      safety_identifier: safetyIdentifier(userId),
      reasoning: { effort: "low" },
      instructions: `Interpreta texto breve en español para Nexo, una app personal de México.
Devuelve exactamente una acción. No ejecutes ni guardes nada.
Usa fechas ISO 8601 y zona America/Monterrey. Hoy es ${new Date().toISOString()}.
Si falta un dato, usa null. No inventes montos, personas, fechas ni lugares.
Usa note cuando el texto no permita una acción confiable.
Para deudas usa debt_type: they_owe_me o i_owe. Para movimientos usa type: expense o income.
El preview debe explicar en una frase qué se propone guardar y que requiere confirmación.`,
      input: text,
      text: {
        format: zodTextFormat(
          interpretedActionSchema,
          "nexo_interpreted_action",
        ),
      },
    });

    if (!response.output_parsed) return null;
    const parsed = response.output_parsed;
    return {
      ...parsed,
      payload: removeNulls(parsed.payload),
      source: "openai" as const,
    };
  },
};
