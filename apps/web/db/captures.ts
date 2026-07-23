import { env } from "cloudflare:workers";

export const moduleKeys = [
  "finances",
  "events",
  "notes",
  "bets",
  "meals",
  "health",
  "gym",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];

export type CaptureRecord = {
  id: string;
  module: ModuleKey;
  content: string;
  createdAt: string;
  occurredAt: string | null;
  amountCents: number | null;
};

type CaptureRow = {
  id: string;
  module: ModuleKey;
  content: string;
  created_at: string;
  occurred_at: string | null;
  amount_cents: number | null;
};

let initialization: Promise<void> | null = null;

function getDatabase(): D1Database {
  if (!env.DB) {
    throw new Error("La base de datos de Nexo no está disponible.");
  }

  return env.DB;
}

async function ensureDatabase(): Promise<void> {
  if (initialization) return initialization;

  const database = getDatabase();
  initialization = database
    .batch([
      database.prepare(`
        CREATE TABLE IF NOT EXISTS captures (
          id TEXT PRIMARY KEY NOT NULL,
          module TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          occurred_at TEXT,
          amount_cents INTEGER
        )
      `),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS captures_created_at_idx ON captures (created_at)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS captures_module_idx ON captures (module)",
      ),
    ])
    .then(() => undefined)
    .catch((error) => {
      initialization = null;
      throw error;
    });

  return initialization;
}

function mapCapture(row: CaptureRow): CaptureRecord {
  return {
    id: row.id,
    module: row.module,
    content: row.content,
    createdAt: row.created_at,
    occurredAt: row.occurred_at,
    amountCents: row.amount_cents,
  };
}

export function isModuleKey(value: unknown): value is ModuleKey {
  return (
    typeof value === "string" && moduleKeys.includes(value as ModuleKey)
  );
}

export function normalizeCaptureContent(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 500) return null;

  return normalized;
}

export async function listCaptures(
  module?: ModuleKey,
): Promise<CaptureRecord[]> {
  await ensureDatabase();
  const database = getDatabase();

  const statement = module
    ? database
        .prepare(
          `SELECT id, module, content, created_at, occurred_at, amount_cents
           FROM captures
           WHERE module = ?
           ORDER BY created_at DESC
           LIMIT 100`,
        )
        .bind(module)
    : database.prepare(
        `SELECT id, module, content, created_at, occurred_at, amount_cents
         FROM captures
         ORDER BY created_at DESC
         LIMIT 100`,
      );

  const result = await statement.all<CaptureRow>();
  return result.results.map(mapCapture);
}

export async function createCapture(input: {
  module: ModuleKey;
  content: string;
}): Promise<CaptureRecord> {
  await ensureDatabase();
  const database = getDatabase();
  const record: CaptureRecord = {
    id: crypto.randomUUID(),
    module: input.module,
    content: input.content,
    createdAt: new Date().toISOString(),
    occurredAt: null,
    amountCents: null,
  };

  await database
    .prepare(
      `INSERT INTO captures (
        id, module, content, created_at, occurred_at, amount_cents
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.module,
      record.content,
      record.createdAt,
      record.occurredAt,
      record.amountCents,
    )
    .run();

  return record;
}

export async function deleteCapture(id: string): Promise<boolean> {
  await ensureDatabase();
  const result = await getDatabase()
    .prepare("DELETE FROM captures WHERE id = ?")
    .bind(id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}
