import { env } from "../../config/env.js";
import type { Sportsbook } from "./bets.validation.js";

const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000;
const imageDataUrlPattern =
  /^data:image\/(?:png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=\s]+$/;

export type ExtractedBetSlip = {
  recognized: boolean;
  sportsbook: Sportsbook;
  stakeCents: number | null;
  decimalOdds: number | null;
  placedAt: string | null;
  selections: Array<{
    event: string;
    selection: string;
    market: string | null;
    decimalOdds: number | null;
  }>;
  warnings: string[];
};

const betSlipSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "recognized",
    "sportsbook",
    "stakeCents",
    "decimalOdds",
    "placedAt",
    "selections",
    "warnings",
  ],
  properties: {
    recognized: { type: "boolean" },
    sportsbook: {
      type: "string",
      enum: ["Caliente", "Draftea", "Otro"],
    },
    stakeCents: {
      anyOf: [{ type: "integer" }, { type: "null" }],
    },
    decimalOdds: {
      anyOf: [{ type: "number" }, { type: "null" }],
    },
    placedAt: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    selections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "event",
          "selection",
          "market",
          "decimalOdds",
        ],
        properties: {
          event: { type: "string" },
          selection: { type: "string" },
          market: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          decimalOdds: {
            anyOf: [{ type: "number" }, { type: "null" }],
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export function isValidBetImageDataUrl(value: unknown): value is string {
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

export async function analyzeBetImage(
  imageDataUrl: string,
): Promise<ExtractedBetSlip> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(45_000),
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
                "Extrae este comprobante o boleto de apuesta.",
                "Devuelve recognized=false si la imagen no es un boleto.",
                "Identifica todas las selecciones visibles en el mismo boleto.",
                "Usa Caliente, Draftea u Otro para sportsbook.",
                "stakeCents es el monto apostado en centavos MXN.",
                "decimalOdds es la cuota total del boleto.",
                "Cada selección puede tener decimalOdds=null si no aparece su cuota individual.",
                "No inventes equipos, mercados, cuotas ni fechas.",
                "Si falta una fecha absoluta, usa placedAt=null.",
                "Describe en warnings cualquier dato faltante o incierto.",
              ].join(" "),
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bet_slip_extraction",
          strict: true,
          schema: betSlipSchema,
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? "OPENAI_IMAGE_ANALYSIS_FAILED",
    );
  }

  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("OPENAI_IMAGE_ANALYSIS_EMPTY");
  const extracted = JSON.parse(outputText) as ExtractedBetSlip;
  return {
    ...extracted,
    stakeCents:
      extracted.stakeCents !== null &&
      Number.isSafeInteger(extracted.stakeCents) &&
      extracted.stakeCents > 0
        ? extracted.stakeCents
        : null,
    decimalOdds:
      extracted.decimalOdds !== null &&
      Number.isFinite(extracted.decimalOdds) &&
      extracted.decimalOdds >= 1.01 &&
      extracted.decimalOdds <= 1_000
        ? extracted.decimalOdds
        : null,
    selections: extracted.selections.slice(0, 20).map((selection) => ({
      ...selection,
      decimalOdds:
        selection.decimalOdds !== null &&
        Number.isFinite(selection.decimalOdds) &&
        selection.decimalOdds >= 1.01 &&
        selection.decimalOdds <= 1_000
          ? selection.decimalOdds
          : null,
    })),
    warnings: extracted.warnings.slice(0, 10),
  };
}
