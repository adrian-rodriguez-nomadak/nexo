import { env } from "../../config/env.js";
import {
  isModuleKey,
  type ModuleKey,
} from "../captures/captures.validation.js";
import {
  isObserverSubmodule,
  type ObserverScope,
  type ObserverSubmodule,
} from "./observer.scopes.js";

const MAX_IMAGE_DATA_URL_LENGTH = 2_000_000;
const imageDataUrlPattern =
  /^data:image\/jpeg;base64,[a-zA-Z0-9+/=\s]+$/;

export type ObserverDetection = {
  recognized: boolean;
  module: ModuleKey | null;
  submodule: ObserverSubmodule | null;
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
    "submodule",
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
    submodule: {
      anyOf: [
        {
          type: "string",
          enum: [
            "accounts",
            "transactions",
            "transfers",
            "balances",
            "appointments",
            "reminders",
            "reservations",
            "deadlines",
            "ideas",
            "tasks",
            "references",
            "lists",
            "tickets",
            "results",
            "bankroll",
            "limits",
            "logs",
            "nutrition",
            "recipes",
            "costs",
            "profile",
            "sleep",
            "hydration",
            "vitals",
            "symptoms",
            "workouts",
            "strength",
            "cardio",
            "mobility",
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

const scopeRules: Record<string, string> = {
  "finances.accounts":
    "Cuentas: aperturas, nombres, tipos, saldos iniciales o información explícita de una cuenta propia. Nunca números completos, CVV, contraseñas ni tokens.",
  "finances.transactions":
    "Movimientos: ingresos, gastos, cargos, depósitos, retiros o comprobantes con monto o descripción claros.",
  "finances.transfers":
    "Transferencias: movimientos explícitos entre cuentas propias, con origen, destino o monto identificable.",
  "finances.balances":
    "Saldos: balances o estados de cuenta propios claramente visibles y útiles, sin guardar identificadores bancarios completos.",
  "events.appointments":
    "Citas: compromisos con fecha u hora, participantes o lugar claros.",
  "events.reminders":
    "Recordatorios: acciones futuras con un momento o condición explícita.",
  "events.reservations":
    "Reservaciones: vuelos, hoteles, restaurantes, entradas o confirmaciones propias.",
  "events.deadlines":
    "Fechas límite: vencimientos, entregas o plazos accionables.",
  "notes.ideas": "Ideas: pensamientos o propuestas propias claramente útiles.",
  "notes.tasks": "Tareas: pendientes o acciones concretas que la persona debe realizar.",
  "notes.references":
    "Referencias: nombres, enlaces, códigos no sensibles o información que conviene consultar después.",
  "notes.lists": "Listas: compras, pasos, elementos o colecciones explícitas.",
  "bets.tickets":
    "Boletos: apuestas ya realizadas, selecciones, cuotas, importe y casa; nunca recomendaciones para apostar.",
  "bets.results": "Resultados: liquidaciones ganadas, perdidas, anuladas o pagos.",
  "bets.bankroll": "Bankroll: saldo destinado explícitamente a apuestas propias.",
  "bets.limits": "Límites: presupuestos o topes personales de apuestas.",
  "meals.logs": "Registro: comidas o bebidas consumidas con fecha o contexto.",
  "meals.nutrition": "Nutrición: calorías, proteína, carbohidratos, grasa o porciones.",
  "meals.recipes": "Recetas: ingredientes e instrucciones útiles para preparar alimentos.",
  "meals.costs": "Costos: precio explícito de alimentos o comidas propias.",
  "health.profile":
    "Perfil: alergias, medicamentos, condiciones o información personal de salud explícita. Nunca datos de terceros.",
  "health.sleep": "Sueño: horas, calidad o periodos de sueño medidos.",
  "health.hydration": "Hidratación: agua o líquidos consumidos en cantidad explícita.",
  "health.vitals":
    "Signos vitales: peso, pulso, presión, glucosa, oxígeno o temperatura medidos. No diagnostiques.",
  "health.symptoms":
    "Síntomas: manifestaciones declaradas por el usuario, sin inferir diagnósticos.",
  "gym.workouts": "Entrenamientos: sesión, duración, fecha o rutina completada.",
  "gym.strength": "Fuerza: ejercicios, series, repeticiones o peso.",
  "gym.cardio": "Cardio: distancia, tiempo, ritmo o actividad cardiovascular.",
  "gym.mobility": "Movilidad: estiramientos, rehabilitación o trabajo de movilidad.",
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

function normalizeDetection(
  value: ObserverDetection,
  enabledScopes: ObserverScope[],
): ObserverDetection {
  const module = isModuleKey(value.module) ? value.module : null;
  const submodule =
    module && isObserverSubmodule(module, value.submodule)
      ? value.submodule
      : null;
  const scopeAllowed =
    module !== null &&
    submodule !== null &&
    enabledScopes.some(
      (scope) =>
        scope.module === module && scope.submodule === submodule,
    );
  const summary = value.summary?.trim().slice(0, 160) || null;
  const content = value.content?.trim().replace(/\s+/g, " ").slice(0, 500) || null;
  const confidence = Math.max(0, Math.min(1, Number(value.confidence) || 0));
  const recognized =
    value.recognized &&
    module !== null &&
    submodule !== null &&
    scopeAllowed &&
    summary !== null &&
    content !== null &&
    confidence >= 0.78;

  return {
    recognized,
    module: recognized ? module : null,
    submodule: recognized ? submodule : null,
    summary: recognized ? summary : null,
    content: recognized ? content : null,
    confidence,
    reason: value.reason.trim().slice(0, 240),
  };
}

export async function analyzeObserverFrame(input: {
  imageDataUrl: string;
  enabledScopes: ObserverScope[];
}): Promise<ObserverDetection> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
  }

  const allowedRules = input.enabledScopes
    .map(
      (scope) =>
        `${scope.module}.${scope.submodule}: ${
          scopeRules[`${scope.module}.${scope.submodule}`]
        }`,
    )
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
                "Clasifica siempre en el módulo y submódulo autorizado más específico.",
                "No guardes contraseñas, tokens, datos bancarios completos, conversaciones privadas ni datos de terceros.",
                "Ignora navegación, anuncios, contenido repetido, datos ambiguos y cualquier cosa que requiera inventar información.",
                "recognized debe ser false si no hay una acción clara o la confianza es menor a 0.78.",
                "summary debe describir brevemente lo detectado para confirmación.",
                "content debe ser un registro autónomo, factual y de máximo 500 caracteres.",
                `Módulos y submódulos autorizados:\n${allowedRules}`,
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
  return normalizeDetection(
    JSON.parse(outputText) as ObserverDetection,
    input.enabledScopes,
  );
}
