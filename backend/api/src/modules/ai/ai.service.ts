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

export const interpretationSchema = z.object({
  actions: z.array(interpretedActionSchema).min(1).max(5),
});

const memoryEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  occurred_at: nullableString,
  category: z.enum([
    "work",
    "health",
    "money",
    "relationship",
    "travel",
    "personal",
    "other",
  ]),
});

const memoryExpenseSchema = z.object({
  description: z.string(),
  amount: nullableNumber,
  currency: z.string(),
});

export const memoryAnalysisSchema = z.object({
  summary: z.string(),
  events: z.array(memoryEventSchema).max(12),
  people: z.array(z.string()).max(12),
  places: z.array(z.string()).max(12),
  topics: z.array(z.string()).max(10),
  emotions: z.array(z.string()).max(8),
  expenses: z.array(memoryExpenseSchema).max(8),
  follow_up_questions: z.array(z.string()).max(8),
  related_note_ids: z.array(z.string()).max(8),
  context_update: z.object({
    compressed_summary: z.string().max(4000),
    known_facts: z.array(z.string()).max(50),
    recurring_patterns: z.array(z.string()).max(20),
  }),
});

export type InterpretedAction = z.infer<typeof interpretedActionSchema>;
export type MemoryAnalysis = z.infer<typeof memoryAnalysisSchema>;

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
Devuelve una acción por cada intención independiente, hasta 5. No ejecutes ni guardes nada.
Una frase puede contener varias acciones; un evento y un gasto deben ser elementos separados.
Usa fechas ISO 8601 y zona America/Monterrey. Hoy es ${new Date().toISOString()}.
Si falta un dato, usa null. No inventes montos, personas, fechas ni lugares.
Usa note cuando el texto no permita una acción confiable.
Para deudas usa debt_type: they_owe_me o i_owe. Para movimientos usa type: expense o income.
El preview debe explicar en una frase qué se propone guardar y que requiere confirmación.`,
      input: text,
      text: {
        format: zodTextFormat(interpretationSchema, "nexo_interpretation"),
      },
    });

    if (!response.output_parsed) return null;
    const parsed = response.output_parsed;
    return {
      actions: parsed.actions.map((action) => ({
        ...action,
        payload: removeNulls(action.payload),
        source: "openai" as const,
      })),
      source: "openai" as const,
    };
  },

  async analyzeMemory(input: {
    text: string;
    userId: string;
    plan: "free" | "premium";
    memoryContext: {
      compressedSummary: string;
      knownFacts: string[];
      recurringPatterns: string[];
    };
    previousNotes: Array<{
      id: string;
      text: string;
      tags: string[];
      summary: string;
      details: Record<string, string>;
    }>;
  }) {
    if (!client) return null;
    const context = input.previousNotes.length
      ? `Notas anteriores para detectar relaciones:\n${input.previousNotes
          .slice(0, 10)
          .map(
            (note) =>
              `- ID ${note.id}; etiquetas: ${note.tags.join(", ")}; resumen: ${note.summary}; texto: ${note.text}; preguntas respondidas: ${Object.entries(note.details)
                .map(([question, answer]) => `${question} => ${answer}`)
                .join(" | ")}`,
          )
          .join("\n")}`
      : "No hay notas anteriores.";
    const generalContext = input.memoryContext.compressedSummary
      ? `Memoria general existente:
Resumen comprimido: ${input.memoryContext.compressedSummary}
Hechos conocidos: ${input.memoryContext.knownFacts.join(" | ")}
Patrones observados: ${input.memoryContext.recurringPatterns.join(" | ")}`
      : "Todavía no existe una memoria general.";
    const questionLimit = input.plan === "free" ? 3 : 8;
    const response = await client.responses.parse({
      model: env.openAiModel,
      store: false,
      safety_identifier: safetyIdentifier(input.userId),
      reasoning: { effort: "low" },
      instructions: `Analiza un relato personal para Nexo, una memoria privada en español de México.
Extrae únicamente hechos presentes en el texto. No inventes nombres, montos, emociones, lugares ni horarios.
Un relato puede contener varios eventos. Usa ISO 8601 cuando exista fecha u hora; en caso contrario usa null.
Las preguntas deben sentirse escritas para esta persona, no para cualquier usuario.
Prioriza en este orden:
1. Cambios respecto a una nota anterior ("antes X, ahora Y").
2. Patrones repetidos y su posible causa concreta.
3. Continuidad de una conversación, persona o proyecto ya conocido.
4. Contradicciones entre el relato nuevo y los hechos conocidos.
5. Una decisión o emoción que cambió y qué provocó ese cambio.
Evita preguntas genéricas como "¿cómo te sentiste?", "¿qué hiciste?", "¿qué hablaste?" o "¿por qué?" sin mencionar el contexto específico.
Cada pregunta debe incluir al menos un detalle concreto del relato actual o la memoria anterior.
Si el relato está completo y no existe una pregunta personalmente útil, devuelve cero preguntas.
Genera como máximo ${questionLimit} preguntas y evita preguntas redundantes o invasivas.
Nunca preguntes algo que ya esté contestado en la memoria general o en las preguntas respondidas de notas anteriores.
Si el nuevo texto confirma un dato conocido, no vuelvas a preguntarlo; úsalo para actualizar patrones.
Relaciona notas anteriores solo cuando exista una razón clara en el contenido.
Los temas deben ser palabras cortas en minúsculas. La moneda predeterminada es MXN.
No hagas diagnósticos médicos, legales o psicológicos.
En context_update devuelve una nueva memoria general autosuficiente que combine la memoria anterior con este relato.
Comprime hechos repetidos en patrones con frecuencia aproximada. Conserva personas, hábitos, preferencias y contexto aún relevante.
No copies relatos completos y no excedas 4000 caracteres en compressed_summary.
Hoy es ${new Date().toISOString()} y la zona del usuario es America/Monterrey.

${generalContext}

${context}`,
      input: input.text,
      text: {
        format: zodTextFormat(memoryAnalysisSchema, "nexo_memory_analysis"),
      },
    });
    if (!response.output_parsed) return null;
    return { ...response.output_parsed, source: "openai" as const };
  },
};
