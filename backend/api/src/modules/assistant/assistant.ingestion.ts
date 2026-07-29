import { env } from "../../config/env.js";
import {
  extractAssistantText,
  type AssistantFile,
} from "./assistant.validation.js";

export async function analyzeAssistantFiles(input: {
  message: string;
  files: AssistantFile[];
}): Promise<string | null> {
  if (input.files.length === 0) return null;
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

  const content: Array<Record<string, unknown>> = [
    ...input.files.map((file) =>
      file.kind === "image"
        ? { type: "input_image", image_url: file.dataUrl, detail: "high" }
        : {
            type: "input_file",
            filename: file.name,
            file_data: file.dataUrl,
            ...(file.name.toLowerCase().endsWith(".pdf")
              ? { detail: "high" }
              : {}),
          },
    ),
    {
      type: "input_text",
      text: [
        "Extrae únicamente información respaldada por los archivos.",
        "Produce un resumen factual útil para un asistente personal.",
        "Incluye fechas, importes, unidades y nombres relevantes, pero omite números completos de cuenta, CLABE, tarjetas, RFC, domicilio, contraseñas y tokens.",
        "Separa claramente hechos visibles, posibles inferencias y datos que requieren confirmación.",
        `Solicitud del usuario: ${input.message}`,
      ].join("\n"),
    },
  ];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_ASSISTANT_MODEL,
      instructions:
        "Eres el extractor multimodal de Nexo. No converses ni ejecutes acciones; entrega evidencia normalizada para otra capa.",
      input: [{ role: "user", content }],
      reasoning: { effort: "low" },
      max_output_tokens: 3_000,
    }),
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as { message?: string } | undefined;
    throw new Error(error?.message ?? "OPENAI_FILE_ANALYSIS_FAILED");
  }
  const text = extractAssistantText(payload);
  if (!text) throw new Error("OPENAI_FILE_ANALYSIS_EMPTY");
  return text;
}
