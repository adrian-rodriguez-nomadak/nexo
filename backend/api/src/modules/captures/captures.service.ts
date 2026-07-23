import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type { ModuleKey } from "./captures.validation.js";

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
  created_at: Date;
  occurred_at: Date | null;
  amount_cents: string | null;
};

function mapCapture(row: CaptureRow): CaptureRecord {
  return {
    id: row.id,
    module: row.module,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    occurredAt: row.occurred_at?.toISOString() ?? null,
    amountCents: row.amount_cents === null ? null : Number(row.amount_cents),
  };
}

export async function listCaptures(
  userId: string,
  module?: ModuleKey,
): Promise<CaptureRecord[]> {
  const result = module
    ? await query<CaptureRow>(
        `SELECT id, module, content, created_at, occurred_at, amount_cents
         FROM captures
         WHERE user_id = $1 AND module = $2
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId, module],
      )
    : await query<CaptureRow>(
        `SELECT id, module, content, created_at, occurred_at, amount_cents
         FROM captures
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId],
      );

  return result.rows.map(mapCapture);
}

export async function createCapture(input: {
  userId: string;
  module: ModuleKey;
  content: string;
}): Promise<CaptureRecord> {
  const id = randomUUID();
  const result = await query<CaptureRow>(
    `INSERT INTO captures (id, user_id, module, content, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, module, content, created_at, occurred_at, amount_cents`,
    [id, input.userId, input.module, input.content],
  );

  return mapCapture(result.rows[0]!);
}

export async function deleteCapture(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    "DELETE FROM captures WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
