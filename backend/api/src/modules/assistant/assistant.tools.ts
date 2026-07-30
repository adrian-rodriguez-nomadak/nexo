import { createHash, randomUUID } from "node:crypto";

import { pool, query } from "../../shared/db/database.js";
import {
  createContextRecord,
  searchContextRecords,
  updateContextRecord,
} from "../context/context.service.js";
import {
  contextRecordKinds,
  contextRecordStatuses,
  contextTopics,
  isContextRecordKind,
  isContextRecordStatus,
  isContextTopic,
  normalizeContextContent,
  normalizeContextDate,
  normalizeContextEntities,
  normalizeContextSearch,
  type ContextTopic,
} from "../context/context.validation.js";
import { remember } from "../memories/memories.service.js";
import {
  isMemoryKind,
  isMemorySensitivity,
} from "../memories/memories.validation.js";

type ToolCall = {
  call_id: string;
  name: string;
  arguments: string;
};

type AccountRow = {
  id: string;
  name: string;
  type: string;
  initial_balance_cents: string;
};

type SearchMemoryRow = {
  id: string;
  content: string;
  kind: string;
  topic: string | null;
  confirmed: boolean;
  updated_at: Date;
};

type SearchCaptureRow = {
  id: string;
  content: string;
  topic: string;
  kind: string;
  occurred_at: Date | null;
  created_at: Date;
};

type StatementInput = {
  accountName: string;
  periodStart: string;
  periodEnd: string;
  initialBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  finalBalanceCents: number;
  notes: string;
};

export const assistantTools = [
  {
    type: "function",
    name: "save_context_record",
    description:
      "Guarda información accionable de cualquier tema de la vida: tareas, eventos, notas, decisiones, transacciones, mediciones, documentos o entradas de diario. Usa un solo tema principal y conecta personas u objetos mediante entities.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: contextTopics,
        },
        kind: {
          type: "string",
          enum: contextRecordKinds,
        },
        content: { type: "string", minLength: 2, maxLength: 2_000 },
        occurredAt: {
          anyOf: [
            { type: "string", description: "Fecha y hora ISO 8601" },
            { type: "null" },
          ],
        },
        dueAt: {
          anyOf: [
            { type: "string", description: "Fecha límite ISO 8601" },
            { type: "null" },
          ],
        },
        entities: {
          type: "array",
          items: { type: "string", minLength: 2, maxLength: 100 },
          maxItems: 12,
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        sensitivity: {
          type: "string",
          enum: ["normal", "sensitive", "restricted"],
        },
        evidence: {
          type: "string",
          enum: ["explicit", "inferred"],
        },
      },
      additionalProperties: false,
      required: [
        "topic",
        "kind",
        "content",
        "occurredAt",
        "dueAt",
        "entities",
        "confidence",
        "sensitivity",
        "evidence",
      ],
    },
  },
  {
    type: "function",
    name: "save_memory",
    description:
      "Guarda un hecho, preferencia, objetivo, evento o patrón personal que será útil en conversaciones futuras. No guardes conversación trivial, secretos, credenciales ni datos de terceros.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", minLength: 2, maxLength: 500 },
        kind: {
          type: "string",
          enum: ["fact", "event", "preference", "goal", "pattern"],
        },
        topic: {
          anyOf: [
            {
              type: "string",
              enum: contextTopics,
            },
            { type: "null" },
          ],
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        sensitivity: {
          type: "string",
          enum: ["normal", "sensitive", "restricted"],
        },
        evidence: {
          type: "string",
          enum: ["explicit", "inferred"],
        },
      },
      additionalProperties: false,
      required: [
        "content",
        "kind",
        "topic",
        "confidence",
        "sensitivity",
        "evidence",
      ],
    },
  },
  {
    type: "function",
    name: "search_personal_context",
    description:
      "Busca bajo demanda registros, memorias y capturas personales. Úsala sólo si la solicitud depende de información previa; formula una consulta específica y pide el menor límite útil.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          anyOf: [
            { type: "string", minLength: 2, maxLength: 300 },
            { type: "null" },
          ],
        },
        topics: {
          type: "array",
          items: { type: "string", enum: contextTopics },
          maxItems: 6,
        },
        statuses: {
          type: "array",
          items: { type: "string", enum: contextRecordStatuses },
          maxItems: 5,
        },
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
      required: ["query", "topics", "statuses", "limit"],
    },
  },
  {
    type: "function",
    name: "update_context_record",
    description:
      "Actualiza un registro recuperado previamente, por ejemplo para completar una tarea, cancelar un recordatorio, cambiar una fecha o corregir su texto. Requiere el id exacto de search_personal_context.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 100 },
        content: {
          anyOf: [
            { type: "string", minLength: 2, maxLength: 2_000 },
            { type: "null" },
          ],
        },
        status: {
          anyOf: [
            { type: "string", enum: contextRecordStatuses },
            { type: "null" },
          ],
        },
        dueAt: {
          anyOf: [
            { type: "string", description: "Nueva fecha ISO 8601" },
            { type: "null" },
          ],
        },
        changeDueAt: { type: "boolean" },
      },
      additionalProperties: false,
      required: ["id", "content", "status", "dueAt", "changeDueAt"],
    },
  },
  {
    type: "function",
    name: "list_finance_accounts",
    description:
      "Consulta la situación financiera conocida: cuentas del libro contable y saldos, deudas o vencimientos guardados por conversación. Úsala antes de afirmar que no existen cuentas o datos financieros.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    },
  },
  {
    type: "function",
    name: "record_finance_statement",
    description:
      "Registra un estado de cuenta ya revisado y confirmado. Crea la cuenta bancaria si aún no existe y agrega un ingreso y un gasto agregados para el periodo.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        accountName: { type: "string", minLength: 2, maxLength: 60 },
        periodStart: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
        periodEnd: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
        initialBalanceCents: { type: "integer" },
        incomeCents: { type: "integer", minimum: 1 },
        expenseCents: { type: "integer", minimum: 1 },
        finalBalanceCents: { type: "integer" },
        notes: { type: "string", minLength: 2, maxLength: 500 },
      },
      additionalProperties: false,
      required: [
        "accountName",
        "periodStart",
        "periodEnd",
        "initialBalanceCents",
        "incomeCents",
        "expenseCents",
        "finalBalanceCents",
        "notes",
      ],
    },
  },
] as const;

export function extractToolCalls(payload: unknown): ToolCall[] {
  if (typeof payload !== "object" || payload === null) return [];
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return [];
  return output.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const value = item as Record<string, unknown>;
    return value.type === "function_call" &&
      typeof value.call_id === "string" &&
      typeof value.name === "string" &&
      typeof value.arguments === "string"
      ? [{
          call_id: value.call_id,
          name: value.name,
          arguments: value.arguments,
        }]
      : [];
  });
}

function normalizeStatement(value: unknown): StatementInput | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const accountName =
    typeof input.accountName === "string" ? input.accountName.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const periodStart =
    typeof input.periodStart === "string" ? input.periodStart : "";
  const periodEnd = typeof input.periodEnd === "string" ? input.periodEnd : "";
  const cents = [
    input.initialBalanceCents,
    input.incomeCents,
    input.expenseCents,
    input.finalBalanceCents,
  ];
  if (
    accountName.length < 2 ||
    accountName.length > 60 ||
    notes.length < 2 ||
    notes.length > 500 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) ||
    Date.parse(periodEnd) < Date.parse(periodStart) ||
    !cents.every(Number.isSafeInteger) ||
    Number(input.incomeCents) <= 0 ||
    Number(input.expenseCents) <= 0
  ) {
    return null;
  }
  return {
    accountName,
    notes,
    periodStart,
    periodEnd,
    initialBalanceCents: Number(input.initialBalanceCents),
    incomeCents: Number(input.incomeCents),
    expenseCents: Number(input.expenseCents),
    finalBalanceCents: Number(input.finalBalanceCents),
  };
}

async function listFinanceAccounts(userId: string) {
  const [result, savedFinancialContext] = await Promise.all([
    query<AccountRow>(
      `SELECT id, name, type, initial_balance_cents
       FROM finance_accounts
       WHERE nexo_user_id = $1
       ORDER BY created_at`,
      [userId],
    ),
    searchContextRecords({
      userId,
      topics: ["finances"],
      statuses: ["active", "pending"],
      limit: 20,
    }),
  ]);
  return {
    accounts: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      initialBalanceCents: Number(row.initial_balance_cents),
    })),
    savedFinancialContext,
  };
}

async function recordFinanceStatement(userId: string, value: unknown) {
  const input = normalizeStatement(value);
  if (!input) return { ok: false, error: "INVALID_STATEMENT_DATA" };

  const fingerprint = createHash("sha256")
    .update(JSON.stringify([
      "finance_statement",
      input.accountName.toLowerCase(),
      input.periodStart,
      input.periodEnd,
      input.incomeCents,
      input.expenseCents,
      input.finalBalanceCents,
    ]))
    .digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const action = await client.query(
      `INSERT INTO nexo_assistant_actions (
        id, nexo_user_id, action_type, fingerprint, payload
      ) VALUES ($1, $2, 'record_finance_statement', $3, $4::JSONB)
      ON CONFLICT (nexo_user_id, fingerprint) DO NOTHING
      RETURNING id`,
      [randomUUID(), userId, fingerprint, JSON.stringify(input)],
    );
    if (action.rowCount === 0) {
      await client.query("COMMIT");
      return { ok: true, duplicate: true };
    }

    let account = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM finance_accounts
       WHERE nexo_user_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [userId, input.accountName],
    );
    if (account.rowCount === 0) {
      account = await client.query(
        `INSERT INTO finance_accounts (
          id, nexo_user_id, name, type, currency, initial_balance_cents, created_at
        ) VALUES ($1, $2, $3, 'bank', 'MXN', $4, NOW())
        RETURNING id, name`,
        [randomUUID(), userId, input.accountName, input.initialBalanceCents],
      );
    }
    const accountId = account.rows[0]!.id;
    const periodDescription =
      `${input.accountName} · ${input.periodStart} a ${input.periodEnd}`;
    await client.query(
      `INSERT INTO finance_transactions (
        id, account_id, kind, category, description, amount_cents,
        occurred_at, created_at
      ) VALUES
        ($1, $3, 'income', 'Estado de cuenta', $4, $5, $8, NOW()),
        ($2, $3, 'expense', 'Estado de cuenta', $6, $7, $8, NOW())`,
      [
        randomUUID(),
        randomUUID(),
        accountId,
        `Abonos · ${periodDescription}`,
        input.incomeCents,
        `Cargos · ${periodDescription}`,
        input.expenseCents,
        `${input.periodEnd}T12:00:00.000Z`,
      ],
    );
    await client.query("COMMIT");
    return {
      ok: true,
      duplicate: false,
      account: account.rows[0]!.name,
      incomeCents: input.incomeCents,
      expenseCents: input.expenseCents,
      expectedFinalBalanceCents: input.finalBalanceCents,
      note: input.notes,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function executeAssistantTool(input: {
  userId: string;
  call: ToolCall;
  writeConfirmed: boolean;
}): Promise<Record<string, unknown>> {
  if (input.call.name === "save_context_record") {
    let args: unknown;
    try {
      args = JSON.parse(input.call.arguments);
    } catch {
      return { ok: false, error: "INVALID_TOOL_ARGUMENTS" };
    }
    if (typeof args !== "object" || args === null) {
      return { ok: false, error: "INVALID_RECORD" };
    }
    const value = args as Record<string, unknown>;
    const content = normalizeContextContent(value.content);
    const occurredAt = normalizeContextDate(value.occurredAt);
    const dueAt = normalizeContextDate(value.dueAt);
    const entities = normalizeContextEntities(value.entities);
    if (
      !isContextTopic(value.topic) ||
      !isContextRecordKind(value.kind) ||
      !content ||
      occurredAt === undefined ||
      dueAt === undefined ||
      !entities ||
      typeof value.confidence !== "number" ||
      value.confidence < 0 ||
      value.confidence > 1 ||
      !isMemorySensitivity(value.sensitivity) ||
      (value.evidence !== "explicit" && value.evidence !== "inferred")
    ) {
      return { ok: false, error: "INVALID_RECORD" };
    }
    const requiresConfirmation =
      (value.topic === "finances" && value.kind === "transaction") ||
      value.sensitivity === "restricted";
    if (requiresConfirmation && !input.writeConfirmed) {
      return {
        ok: false,
        error: "CONFIRMATION_REQUIRED",
        instruction:
          "Resume el registro sensible o financiero con sus datos concretos y pide confirmación explícita. No afirmes que se guardó.",
      };
    }
    const result = await createContextRecord({
      userId: input.userId,
      topic: value.topic,
      kind: value.kind,
      content,
      entities,
      sensitivity: value.sensitivity,
      confidence: value.confidence,
      source: value.evidence === "explicit" ? "chat" : "derived",
      occurredAt,
      dueAt,
    });
    return {
      ok: true,
      duplicate: result.duplicate,
      record: result.record,
    };
  }
  if (input.call.name === "save_memory") {
    let args: unknown;
    try {
      args = JSON.parse(input.call.arguments);
    } catch {
      return { ok: false, error: "INVALID_TOOL_ARGUMENTS" };
    }
    if (typeof args !== "object" || args === null) {
      return { ok: false, error: "INVALID_MEMORY" };
    }
    const value = args as Record<string, unknown>;
    const content = typeof value.content === "string"
      ? value.content.trim().replace(/\s+/g, " ")
      : "";
    const topic: ContextTopic | null = value.topic === null
      ? null
      : isContextTopic(value.topic)
        ? value.topic
        : null;
    if (
      content.length < 2 ||
      content.length > 500 ||
      !isMemoryKind(value.kind) ||
      (value.topic !== null && topic === null) ||
      typeof value.confidence !== "number" ||
      value.confidence < 0 ||
      value.confidence > 1 ||
      !isMemorySensitivity(value.sensitivity) ||
      (value.evidence !== "explicit" && value.evidence !== "inferred")
    ) {
      return { ok: false, error: "INVALID_MEMORY" };
    }
    const memory = await remember({
      userId: input.userId,
      content,
      kind: value.kind,
      module: topic,
      source: value.evidence === "explicit" ? "manual" : "derived",
      sourceRecordIds: [],
      confidence: value.confidence,
      sensitivity: value.sensitivity,
      userConfirmed: value.evidence === "explicit",
    });
    return {
      ok: true,
      memoryId: memory.id,
      confirmed: memory.userConfirmed,
    };
  }
  if (input.call.name === "search_personal_context") {
    let args: unknown;
    try {
      args = JSON.parse(input.call.arguments);
    } catch {
      return { ok: false, error: "INVALID_TOOL_ARGUMENTS" };
    }
    if (typeof args !== "object" || args === null) {
      return { ok: false, error: "INVALID_SEARCH" };
    }
    const value = args as Record<string, unknown>;
    const search = value.query === null
      ? undefined
      : normalizeContextSearch(value.query) ?? undefined;
    const topics = Array.isArray(value.topics)
      ? value.topics.filter(isContextTopic)
      : [];
    const statuses = Array.isArray(value.statuses)
      ? value.statuses.filter(isContextRecordStatus)
      : [];
    const limit = Number(value.limit);
    if (
      (value.query !== null && !search) ||
      !Array.isArray(value.topics) ||
      topics.length !== value.topics.length ||
      !Array.isArray(value.statuses) ||
      statuses.length !== value.statuses.length ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 20
    ) {
      return { ok: false, error: "INVALID_SEARCH" };
    }
    const selectedTopics = topics.length ? topics : undefined;
    const [records, memories, captures] = await Promise.all([
      searchContextRecords({
        userId: input.userId,
        search,
        topics: selectedTopics,
        statuses: statuses.length ? statuses : undefined,
        limit,
      }),
      query<SearchMemoryRow>(
        `SELECT id, content, memory_kind AS kind, module AS topic,
                user_confirmed AS confirmed, updated_at
         FROM nexo_memories
         WHERE nexo_user_id = $1
           AND status = 'active'
           AND ($2::TEXT IS NULL OR content ILIKE '%' || $2 || '%')
           AND ($3::TEXT[] IS NULL OR module = ANY($3))
         ORDER BY user_confirmed DESC, updated_at DESC
         LIMIT $4`,
        [input.userId, search ?? null, selectedTopics ?? null, limit],
      ),
      query<SearchCaptureRow>(
        `SELECT id, content, module AS topic,
                COALESCE(submodule, 'record') AS kind,
                occurred_at, created_at
         FROM captures
         WHERE nexo_user_id = $1
           AND ($2::TEXT IS NULL OR content ILIKE '%' || $2 || '%')
           AND ($3::TEXT[] IS NULL OR module = ANY($3))
         ORDER BY created_at DESC
         LIMIT $4`,
        [input.userId, search ?? null, selectedTopics ?? null, limit],
      ),
    ]);
    return {
      ok: true,
      records,
      memories: memories.rows.map((memory) => ({
        id: memory.id,
        content: memory.content,
        kind: memory.kind,
        topic: memory.topic,
        confirmed: memory.confirmed,
        updatedAt: memory.updated_at.toISOString(),
      })),
      captures: captures.rows.map((capture) => ({
        id: capture.id,
        content: capture.content,
        topic: capture.topic,
        kind: capture.kind,
        occurredAt: capture.occurred_at?.toISOString() ?? null,
        createdAt: capture.created_at.toISOString(),
      })),
    };
  }
  if (input.call.name === "update_context_record") {
    let args: unknown;
    try {
      args = JSON.parse(input.call.arguments);
    } catch {
      return { ok: false, error: "INVALID_TOOL_ARGUMENTS" };
    }
    if (typeof args !== "object" || args === null) {
      return { ok: false, error: "INVALID_UPDATE" };
    }
    const value = args as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : "";
    const content = value.content === null
      ? undefined
      : normalizeContextContent(value.content) ?? undefined;
    const status = value.status === null
      ? undefined
      : isContextRecordStatus(value.status)
        ? value.status
        : undefined;
    const dueAt = value.changeDueAt
      ? normalizeContextDate(value.dueAt)
      : undefined;
    if (
      !id ||
      id.length > 100 ||
      (value.content !== null && !content) ||
      (value.status !== null && !status) ||
      typeof value.changeDueAt !== "boolean" ||
      (value.changeDueAt && dueAt === undefined) ||
      (!content && !status && !value.changeDueAt)
    ) {
      return { ok: false, error: "INVALID_UPDATE" };
    }
    const record = await updateContextRecord({
      id,
      userId: input.userId,
      content,
      status,
      dueAt,
    });
    return record
      ? { ok: true, record }
      : { ok: false, error: "RECORD_NOT_FOUND" };
  }
  if (input.call.name === "list_finance_accounts") {
    return listFinanceAccounts(input.userId);
  }
  if (input.call.name === "record_finance_statement") {
    if (!input.writeConfirmed) {
      return {
        ok: false,
        error: "CONFIRMATION_REQUIRED",
        instruction:
          "Presenta exactamente lo que se registrará y pide confirmación explícita. No afirmes que se guardó.",
      };
    }
    let args: unknown;
    try {
      args = JSON.parse(input.call.arguments);
    } catch {
      return { ok: false, error: "INVALID_TOOL_ARGUMENTS" };
    }
    return recordFinanceStatement(input.userId, args);
  }
  return { ok: false, error: "UNKNOWN_TOOL" };
}
