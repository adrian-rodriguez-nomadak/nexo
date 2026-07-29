import { createHash, randomUUID } from "node:crypto";

import { pool, query } from "../../shared/db/database.js";
import {
  createCapture,
} from "../captures/captures.service.js";
import {
  isModuleKey,
  type ModuleKey,
} from "../captures/captures.validation.js";
import { remember } from "../memories/memories.service.js";
import {
  isMemoryKind,
  isMemorySensitivity,
} from "../memories/memories.validation.js";
import { isObserverSubmodule } from "../observer/observer.scopes.js";

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
    name: "save_personal_record",
    description:
      "Guarda un registro factual en el área adecuada de Nexo a partir de texto o evidencia de un archivo. Úsala para información útil que no requiera una operación financiera especializada.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        module: {
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
        submodule: {
          type: "string",
          enum: [
            "accounts", "transactions", "transfers", "balances",
            "appointments", "reminders", "reservations", "deadlines",
            "ideas", "tasks", "references", "lists",
            "tickets", "results", "bankroll", "limits",
            "logs", "nutrition", "recipes", "costs",
            "profile", "sleep", "hydration", "vitals", "symptoms",
            "workouts", "strength", "cardio", "mobility",
          ],
        },
        content: { type: "string", minLength: 2, maxLength: 500 },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        remember: { type: "boolean" },
        evidence: {
          type: "string",
          enum: ["explicit", "inferred"],
        },
      },
      additionalProperties: false,
      required: [
        "module",
        "submodule",
        "content",
        "confidence",
        "remember",
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
        "module",
        "confidence",
        "sensitivity",
        "evidence",
      ],
    },
  },
  {
    type: "function",
    name: "list_finance_accounts",
    description:
      "Lista las cuentas financieras del usuario antes de proponer o registrar movimientos.",
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
  const result = await query<AccountRow>(
    `SELECT id, name, type, initial_balance_cents
     FROM finance_accounts
     WHERE nexo_user_id = $1
     ORDER BY created_at`,
    [userId],
  );
  return {
    accounts: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      initialBalanceCents: Number(row.initial_balance_cents),
    })),
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
  if (input.call.name === "save_personal_record") {
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
    const content = typeof value.content === "string"
      ? value.content.trim().replace(/\s+/g, " ")
      : "";
    if (
      !isModuleKey(value.module) ||
      !isObserverSubmodule(value.module, value.submodule) ||
      content.length < 2 ||
      content.length > 500 ||
      typeof value.confidence !== "number" ||
      value.confidence < 0 ||
      value.confidence > 1 ||
      typeof value.remember !== "boolean" ||
      (value.evidence !== "explicit" && value.evidence !== "inferred")
    ) {
      return { ok: false, error: "INVALID_RECORD" };
    }
    const capture = await createCapture({
      userId: input.userId,
      module: value.module,
      submodule: value.submodule,
      content,
    });
    if (value.remember) {
      await remember({
        userId: input.userId,
        content,
        kind: "fact",
        module: value.module,
        source: value.evidence === "explicit" ? "manual" : "derived",
        sourceRecordIds: [capture.id],
        confidence: value.confidence,
        sensitivity:
          value.module === "health" || value.module === "finances"
            ? "sensitive"
            : "normal",
        userConfirmed: value.evidence === "explicit",
      });
    }
    return {
      ok: true,
      recordId: capture.id,
      module: capture.module,
      submodule: capture.submodule,
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
    const module: ModuleKey | null = value.module === null
      ? null
      : isModuleKey(value.module)
        ? value.module
        : null;
    if (
      content.length < 2 ||
      content.length > 500 ||
      !isMemoryKind(value.kind) ||
      (value.module !== null && module === null) ||
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
      module,
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
