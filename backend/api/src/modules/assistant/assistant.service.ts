import { query } from "../../shared/db/database.js";
import { analyzeAssistantFiles } from "./assistant.ingestion.js";
import {
  callTextModel,
  type TextMessage,
} from "./assistant.text-provider.js";
import {
  executeAssistantTool,
} from "./assistant.tools.js";
import {
  hasExplicitConfirmation,
  type AssistantFile,
  type AssistantHistoryMessage,
} from "./assistant.validation.js";

type ContextRow = {
  content: string;
  module: string | null;
  kind: string;
  confirmed: boolean;
  updated_at: Date;
};

const stopWords = new Set([
  "para", "como", "pero", "porque", "esto", "esta", "este", "estos", "estas",
  "sobre", "desde", "hasta", "tengo", "quiero", "puedes", "podrias", "dime",
  "hola", "gracias", "algo", "todo", "cuando", "donde", "cual", "con", "sin",
  "una", "uno", "unos", "unas", "que", "por", "del", "las", "los", "mis",
  "me", "mi", "tu", "yo", "es", "un", "en", "y", "o", "a",
]);

function tokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es-MX")
      .match(/[\p{L}\p{N}]{2,}/gu)
      ?.filter((token) => !stopWords.has(token)) ?? [],
  );
}

export function rankContext<T extends ContextRow>(
  rows: T[],
  message: string,
  limit = 18,
): T[] {
  const queryTokens = tokens(message);
  const now = Date.now();
  return rows
    .map((row, index) => {
      const rowTokens = tokens(`${row.content} ${row.module ?? ""} ${row.kind}`);
      const overlap = [...queryTokens].filter((token) => rowTokens.has(token)).length;
      const ageDays = Math.max(
        0,
        (now - row.updated_at.getTime()) / (1000 * 60 * 60 * 24),
      );
      const score =
        overlap * 12 +
        (row.confirmed ? 4 : 0) +
        Math.max(0, 3 - ageDays / 30) -
        index / 1000;
      return { row, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ row }) => row);
}

async function loadPersonalContext(
  userId: string,
  message: string,
): Promise<string> {
  const [memories, captures] = await Promise.all([
    query<ContextRow>(
      `SELECT content, module, memory_kind AS kind,
              user_confirmed AS confirmed, updated_at
       FROM nexo_memories
       WHERE nexo_user_id = $1 AND status = 'active'
       ORDER BY user_confirmed DESC, updated_at DESC
       LIMIT 200`,
      [userId],
    ),
    query<ContextRow>(
      `SELECT content, module, COALESCE(submodule, 'record') AS kind,
              TRUE AS confirmed, created_at AS updated_at
       FROM captures
       WHERE nexo_user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId],
    ),
  ]);
  const relevantMemories = rankContext(memories.rows, message);
  const relevantCaptures = rankContext(captures.rows, message, 10);
  return [
    relevantMemories.length
      ? `Memorias relevantes:\n${relevantMemories.map((row) => `- [${row.kind}${row.module ? ` · ${row.module}` : ""}] ${row.content}`).join("\n")}`
      : "",
    relevantCaptures.length
      ? `Registros relacionados:\n${relevantCaptures.map((row) => `- [${row.module}.${row.kind}] ${row.content}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n\n");
}

function systemInstructions(input: {
  displayName: string;
  personalContext: string;
}): string {
  return [
    "Eres Nexo, un asistente personal privado que organiza información y ayuda a tomar decisiones.",
    `La persona se llama ${input.displayName}. Responde en español salvo que te pidan otro idioma.`,
    "Usa las herramientas para guardar información personal útil y para consultar o actualizar módulos.",
    "Guarda como memoria los hechos, preferencias, objetivos y eventos personales que probablemente serán útiles después. No guardes saludos, conversación trivial, credenciales, números bancarios completos ni información privada de terceros.",
    "Los hechos expresados directamente por el usuario son evidencia explícita. Las conclusiones derivadas son inferencias y deben conservar confianza y posibilidad de revisión.",
    "Las lecturas y memorias explícitas pueden ejecutarse directamente. Antes de cualquier escritura financiera, muestra cuenta, concepto, fecha e importe y pide confirmación. Sólo llama la herramienta de escritura cuando el mensaje actual sea esa confirmación.",
    "Si una herramienta confirma una escritura, informa claramente qué se guardó. Si devuelve duplicate=true, explica que ya estaba registrado y no lo duplicaste.",
    "No digas que guardaste, registraste o modificaste algo si no recibiste un resultado exitoso de herramienta.",
    "Sé directo, cálido y conciso. Distingue hechos de inferencias.",
    input.personalContext || "Nexo aún no tiene contexto personal guardado.",
  ].join("\n\n");
}

export async function answerWithNexo(input: {
  userId: string;
  displayName: string;
  message: string;
  history: AssistantHistoryMessage[];
  files: AssistantFile[];
}): Promise<string> {
  const [personalContext, fileAnalysis] = await Promise.all([
    loadPersonalContext(input.userId, input.message),
    analyzeAssistantFiles({
      message: input.message,
      files: input.files,
    }),
  ]);
  const currentMessage = fileAnalysis
    ? [
        input.message,
        "",
        "Evidencia extraída de los archivos por el analizador multimodal:",
        fileAnalysis,
      ].join("\n")
    : input.message;
  const messages: TextMessage[] = [
    {
      role: "system",
      content: systemInstructions({
        displayName: input.displayName,
        personalContext,
      }),
    },
    ...input.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: currentMessage },
  ];
  const writeConfirmed = hasExplicitConfirmation(input.message, input.history);

  for (let turn = 0; turn < 4; turn += 1) {
    const reply = await callTextModel(messages);
    messages.push(reply.rawMessage);
    if (reply.toolCalls.length === 0) {
      if (!reply.content) throw new Error("TEXT_MODEL_EMPTY");
      return reply.content;
    }
    for (const toolCall of reply.toolCalls) {
      const result = await executeAssistantTool({
        userId: input.userId,
        call: {
          call_id: toolCall.id,
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        },
        writeConfirmed,
      });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }
  throw new Error("TEXT_MODEL_TOOL_LOOP_LIMIT");
}
