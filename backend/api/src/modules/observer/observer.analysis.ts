import { env } from "../../config/env.js";
import {
  isModuleKey,
  type ModuleKey,
} from "../captures/captures.validation.js";

const MAX_IMAGE_DATA_URL_LENGTH = 2_000_000;
const imageDataUrlPattern =
  /^data:image\/jpeg;base64,[a-zA-Z0-9+/=\s]+$/;

export type ObserverDetection = {
  recognized: boolean;
  module: ModuleKey | null;
  summary: string | null;
  content: string | null;
  confidence: number;
  reason: string;
};

const observerDetectionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "recognized",
    "module",
    "summary",
    "content",
    "confidence",
    "reason",
  ],
  properties: {
    recognized: { type: "boolean" },
    module: {
      anyOf: [
        {
          type: "string",
          enum: [
            "finances",
            "events",
            "notes",
            "bets",
            "meals",
            "health",
            "gym",
          ],
        },
        { type: "null" },
      ],
    },
    summary: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    content: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
} as const;

const moduleRules: Record<ModuleKey, string> = {
  finances:
    "Finanzas: sólo ingresos, gastos o comprobantes con monto explícito. No balances vistos incidentalmente.",
  events:
    "Eventos: citas, reservaciones, fechas límite o planes con fecha o contexto temporal claro.",
  notes:
    "Notas: ideas, referencias o información claramente útil para recordar. No texto de navegación ni contenido genérico.",
  bets:
    "Apuestas: sólo boletos ya realizados o resultados. Nunca recomendaciones, cuotas promocionales ni invitaciones a apostar.",
  meals:
    "Comidas: alimentos consumidos, recetas o información nutrimental relevante.",
  health:
    "Salud: mediciones explícitas de sueño, agua o bienestar. No hagas diagnósticos.",
  gym:
    "Gimnasio: entrenamientos, ejercicios, series, repeticiones, peso o duración.",
};

export function isValidObserverImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_IMAGE_DATA_URL_LENGTH &&
    imageDataUrlPattern.test(value)
  );
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function normalizeDetection(value: ObserverDetection): ObserverDetection {
  const module = isModuleKey(value.module) ? value.module : null;
  const summary = value.summary?.trim().slice(0, 160) || null;
  const content = value.content?.trim().replace(/\s+/g, " ").slice(0, 500) || null;
  const confidence = Math.max(0, Math.min(1, Number(value.confidence) || 0));
  const recognized =
    value.recognized &&
    module !== null &&
    summary !== null &&
    content !== null &&
    confidence >= 0.78;

  return {
    recognized,
    module: recognized ? module : null,
    summary: recognized ? summary : null,
    content: recognized ? content : null,
    confidence,
    reason: value.reason.trim().slice(0, 240),
  };
}

export async function analyzeObserverFrame(input: {
  imageDataUrl: string;
  enabledModules: ModuleKey[];
}): Promise<ObserverDetection> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
  }

  const allowedRules = input.enabledModules
    .map((module) => moduleRules[module])
    .join("\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL,
      reasoning: { effort: "none" },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Analiza esta captura de pantalla para el Observador de Nexo.",
                "Detecta como máximo un registro que sea claramente útil y pertenezca a un módulo autorizado.",
                "No guardes contraseñas, tokens, datos bancarios completos, conversaciones privadas ni datos de terceros.",
                "Ignora navegación, anuncios, contenido repetido, datos ambiguos y cualquier cosa que requiera inventar información.",
                "recognized debe ser false si no hay una acción clara o la confianza es menor a 0.78.",
                "summary debe describir brevemente lo detectado para confirmación.",
                "content debe ser un registro autónomo, factual y de máximo 500 caracteres.",
                `Módulos autorizados:\n${allowedRules}`,
              ].join("\n"),
            },
            {
              type: "input_image",
              image_url: input.imageDataUrl,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "observer_detection",
          strict: true,
          schema: observerDetectionSchema,
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OPENAI_OBSERVER_ANALYSIS_FAILED");
  }

  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("OPENAI_OBSERVER_ANALYSIS_EMPTY");
  return normalizeDetection(JSON.parse(outputText) as ObserverDetection);
}
