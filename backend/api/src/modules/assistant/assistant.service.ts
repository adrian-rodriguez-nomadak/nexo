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
  const [records, memories, captures] = await Promise.all([
    query<ContextRow>(
      `SELECT
         CONCAT(
           content,
           CASE WHEN status IN ('pending', 'completed')
             THEN ' · estado: ' || status ELSE '' END,
           CASE WHEN due_at IS NOT NULL
             THEN ' · fecha: ' || due_at::TEXT ELSE '' END,
           CASE WHEN cardinality(entities) > 0
             THEN ' · relacionado con: ' || array_to_string(entities, ', ')
             ELSE '' END
         ) AS content,
         topic AS module,
         record_kind AS kind,
         source <> 'derived' AS confirmed,
         updated_at
       FROM nexo_context_records
       WHERE nexo_user_id = $1
         AND status NOT IN ('cancelled', 'archived')
       ORDER BY updated_at DESC
       LIMIT 250`,
      [userId],
    ),
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
  const relevantRecords = rankContext(records.rows, message, 24);
  const relevantMemories = rankContext(memories.rows, message);
  const relevantCaptures = rankContext(captures.rows, message, 10);
  return [
    relevantRecords.length
      ? `Contexto personal relevante:\n${relevantRecords.map((row) => `- [${row.module ?? "general"} · ${row.kind}] ${row.content}`).join("\n")}`
      : "",
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
  timeZone: string;
}): string {
  return [
    "Eres Nexo, un asistente personal privado que conversa, recuerda, organiza y ayuda a actuar. Eres una sola conversación para cualquier tema de la vida; nunca obligas a la persona a elegir un módulo o una sección.",
    `La persona se llama ${input.displayName}. Responde en español salvo que te pidan otro idioma.`,
    "La clasificación por temas es interna. No anuncies nombres de temas ni expliques la arquitectura al guardar algo, salvo que la persona lo pregunte.",
    `La zona horaria de la persona es ${input.timeZone} y ahora es ${new Date().toLocaleString("es-MX", { timeZone: input.timeZone, dateStyle: "full", timeStyle: "long" })}. Interpreta allí fechas relativas como hoy o mañana. Si una fecha sigue siendo ambigua, pregunta antes de guardarla.`,
    "Usa save_context_record para información concreta o accionable: tareas, recordatorios, eventos, notas, decisiones, transacciones, mediciones, documentos y entradas de diario. Elige el tema principal y agrega nombres de personas, proyectos, cuentas, lugares u objetos en entities para conectar el contexto.",
    "Usa save_memory sólo para hechos estables, preferencias, objetivos o patrones que probablemente mejoren conversaciones futuras. No conviertas cada mensaje en memoria y no dupliques un registro como memoria salvo que tenga valor duradero.",
    "Usa search_personal_context antes de responder consultas que exijan recuperar pendientes, fechas o registros exactos. Para cambiar o completar algo, busca primero su id y luego usa update_context_record.",
    "No guardes saludos, conversación trivial, credenciales, números bancarios completos, secretos ni información privada innecesaria de terceros.",
    "Los hechos expresados directamente por el usuario son evidencia explícita. Las conclusiones derivadas son inferencias y deben conservar confianza y posibilidad de revisión.",
    "Las lecturas, tareas, notas, recordatorios y memorias explícitas pueden guardarse directamente. Antes de una transacción financiera o un registro restringido, muestra los datos concretos y pide confirmación. Sólo ejecuta esa escritura cuando el mensaje actual sea la confirmación.",
    "Si una herramienta confirma una escritura, informa claramente qué se guardó. Si devuelve duplicate=true, explica que ya estaba registrado y no lo duplicaste.",
    "No digas que guardaste, registraste o modificaste algo si no recibiste un resultado exitoso de herramienta.",
    "En salud, organiza el contexto y ofrece orientación prudente, pero no presentes diagnósticos. Recomienda ayuda profesional o urgente cuando corresponda.",
    "Puedes responder preguntas generales sin herramientas. No inventes datos personales ausentes y pregunta sólo cuando la ambigüedad cambie de forma material el resultado.",
    "Sé directo, cálido y conciso. Distingue hechos de inferencias.",
    input.personalContext || "Nexo aún no tiene contexto personal guardado.",
  ].join("\n\n");
}

export async function answerWithNexo(input: {
  userId: string;
  displayName: string;
  message: string;
  timeZone: string;
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
        timeZone: input.timeZone,
      }),
    },
    ...input.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: currentMessage },
  ];
  const writeConfirmed = hasExplicitConfirmation(input.message, input.history);
  console.info(JSON.stringify({
    event: "assistant_confirmation_evaluated",
    writeConfirmed,
    historyMessageCount: input.history.length,
  }));

  for (let turn = 0; turn < 4; turn += 1) {
    const reply = await callTextModel(messages);
    messages.push(reply.rawMessage);
    if (reply.toolCalls.length === 0) {
      console.info(JSON.stringify({
        event: "assistant_model_reply",
        turn,
        writeConfirmed,
        toolCallCount: 0,
      }));
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
      console.info(JSON.stringify({
        event: "assistant_tool_result",
        turn,
        tool: toolCall.function.name,
        writeConfirmed,
        ok: result.ok === true,
        error: typeof result.error === "string" ? result.error : null,
      }));
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }
  throw new Error("TEXT_MODEL_TOOL_LOOP_LIMIT");
}
