import { createHash, randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type { MemorySensitivity } from "../memories/memories.validation.js";
import type {
  ContextRecordKind,
  ContextRecordStatus,
  ContextTopic,
} from "./context.validation.js";

export type ContextRecord = {
  id: string;
  topic: ContextTopic;
  kind: ContextRecordKind;
  content: string;
  status: ContextRecordStatus;
  entities: string[];
  sensitivity: MemorySensitivity;
  confidence: number;
  source: "chat" | "file" | "derived" | "manual";
  occurredAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContextRecordRow = {
  id: string;
  topic: ContextTopic;
  record_kind: ContextRecordKind;
  content: string;
  status: ContextRecordStatus;
  entities: string[];
  sensitivity: MemorySensitivity;
  confidence: string;
  source: "chat" | "file" | "derived" | "manual";
  occurred_at: Date | null;
  due_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const returningColumns = `
  id, topic, record_kind, content, status, entities, sensitivity, confidence,
  source, occurred_at, due_at, created_at, updated_at
`;

function mapRecord(row: ContextRecordRow): ContextRecord {
  return {
    id: row.id,
    topic: row.topic,
    kind: row.record_kind,
    content: row.content,
    status: row.status,
    entities: row.entities,
    sensitivity: row.sensitivity,
    confidence: Number(row.confidence),
    source: row.source,
    occurredAt: row.occurred_at?.toISOString() ?? null,
    dueAt: row.due_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function recordFingerprint(input: {
  topic: ContextTopic;
  kind: ContextRecordKind;
  content: string;
  occurredAt: string | null;
  dueAt: string | null;
}): string {
  return createHash("sha256")
    .update(JSON.stringify([
      input.topic,
      input.kind,
      input.content.toLocaleLowerCase("es-MX"),
      input.occurredAt,
      input.dueAt,
    ]))
    .digest("hex");
}

export async function createContextRecord(input: {
  userId: string;
  topic: ContextTopic;
  kind: ContextRecordKind;
  content: string;
  entities: string[];
  sensitivity: MemorySensitivity;
  confidence: number;
  source: "chat" | "file" | "derived" | "manual";
  occurredAt: string | null;
  dueAt: string | null;
}): Promise<{ record: ContextRecord; duplicate: boolean }> {
  const fingerprint = recordFingerprint(input);
  const result = await query<ContextRecordRow & { inserted: boolean }>(
    `INSERT INTO nexo_context_records (
       id, nexo_user_id, topic, record_kind, content, status, entities,
       sensitivity, confidence, source, fingerprint, occurred_at, due_at,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
     )
     ON CONFLICT (nexo_user_id, fingerprint)
     DO UPDATE SET
       entities = (
         SELECT ARRAY(
           SELECT DISTINCT item
           FROM unnest(
             nexo_context_records.entities || EXCLUDED.entities
           ) AS item
         )
       ),
       confidence = GREATEST(nexo_context_records.confidence, EXCLUDED.confidence),
       updated_at = NOW()
     RETURNING ${returningColumns}, (xmax = 0) AS inserted`,
    [
      randomUUID(),
      input.userId,
      input.topic,
      input.kind,
      input.content,
      input.kind === "task" || input.kind === "reminder" ? "pending" : "active",
      input.entities,
      input.sensitivity,
      input.confidence,
      input.source,
      fingerprint,
      input.occurredAt,
      input.dueAt,
    ],
  );
  const row = result.rows[0]!;
  return { record: mapRecord(row), duplicate: !row.inserted };
}

export async function searchContextRecords(input: {
  userId: string;
  search?: string;
  topics?: ContextTopic[];
  statuses?: ContextRecordStatus[];
  limit?: number;
}): Promise<ContextRecord[]> {
  const result = await query<ContextRecordRow>(
    `SELECT ${returningColumns}
     FROM nexo_context_records
     WHERE nexo_user_id = $1
       AND (
         $2::TEXT IS NULL OR
         content ILIKE '%' || $2 || '%' OR
         EXISTS (
           SELECT 1 FROM unnest(entities) entity
           WHERE entity ILIKE '%' || $2 || '%'
         )
       )
       AND ($3::TEXT[] IS NULL OR topic = ANY($3))
       AND ($4::TEXT[] IS NULL OR status = ANY($4))
     ORDER BY
       CASE WHEN due_at IS NOT NULL AND status = 'pending' THEN 0 ELSE 1 END,
       due_at ASC NULLS LAST,
       updated_at DESC
     LIMIT $5`,
    [
      input.userId,
      input.search ?? null,
      input.topics?.length ? input.topics : null,
      input.statuses?.length ? input.statuses : null,
      Math.min(Math.max(input.limit ?? 30, 1), 100),
    ],
  );
  return result.rows.map(mapRecord);
}

export async function updateContextRecord(input: {
  id: string;
  userId: string;
  content?: string;
  status?: ContextRecordStatus;
  dueAt?: string | null;
}): Promise<ContextRecord | null> {
  const result = await query<ContextRecordRow>(
    `UPDATE nexo_context_records
     SET content = COALESCE($3, content),
         status = COALESCE($4, status),
         due_at = CASE WHEN $5 THEN $6::TIMESTAMPTZ ELSE due_at END,
         updated_at = NOW()
     WHERE id = $1 AND nexo_user_id = $2
     RETURNING ${returningColumns}`,
    [
      input.id,
      input.userId,
      input.content ?? null,
      input.status ?? null,
      input.dueAt !== undefined,
      input.dueAt ?? null,
    ],
  );
  return result.rows[0] ? mapRecord(result.rows[0]) : null;
}
