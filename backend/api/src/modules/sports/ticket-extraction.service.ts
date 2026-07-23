import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "../../config/env.js";

export const extractedTicketSchema = z.object({
  bookmaker: z.string().nullable(),
  stake: z.number().nullable(),
  totalOdds: z.number().nullable(),
  betType: z.enum(["single", "parlay"]),
  selections: z
    .array(
      z.object({
        match: z.string(),
        market: z.string(),
        selection: z.string(),
        odds: z.number().nullable(),
      }),
    )
    .max(20),
  confidence: z.number().min(0).max(1),
  fieldsToReview: z.array(z.string()).max(20),
});

const client =
  env.openAiApiKey === "change_me"
    ? null
    : new OpenAI({ apiKey: env.openAiApiKey, timeout: 25_000, maxRetries: 1 });

export const ticketExtractionService = {
  configured: () => client !== null,

  async extract(imageDataUrl: string, userId: string) {
    if (!client) return null;
    const response = await client.responses.parse({
      model: env.openAiModel,
      store: false,
      safety_identifier: createHash("sha256")
        .update(`nexo-bet:${userId}`)
        .digest("hex"),
      reasoning: { effort: "low" },
      instructions: `Lee únicamente el boleto de apuesta deportiva en la imagen.
Devuelve los campos visibles en español neutro. No inventes datos ilegibles.
Usa null para monto, cuota total, bookmaker o cuota de selección si no se distinguen.
betType es parlay cuando existen varias selecciones.
Incluye en fieldsToReview cada campo dudoso o faltante.
El usuario siempre deberá confirmar la lectura antes de calcular riesgo.`,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extrae y normaliza este boleto de apuesta.",
            },
            { type: "input_image", image_url: imageDataUrl, detail: "high" },
          ],
        },
      ],
      text: { format: zodTextFormat(extractedTicketSchema, "nexo_bet_ticket") },
    });
    return response.output_parsed;
  },
};
