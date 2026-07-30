import { createHash, randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type { ContextTopic } from "../context/context.validation.js";
import type {
  MemoryKind,
  MemorySensitivity,
  MemorySource,
  MemoryStatus,
} from "./memories.validation.js";

export type NexoMemory = {
  id: string;
  content: string;
  kind: MemoryKind;
  module: ContextTopic | null;
  source: MemorySource;
  sourceRecordIds: string[];
  confidence: number;
  sensitivity: MemorySensitivity;
  userConfirmed: boolean;
  status: MemoryStatus;
  occurredAt: string | null;
  validUntil: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
};

type MemoryRow = {
  id: string;
  content: string;
  memory_kind: MemoryKind;
  module: ContextTopic | null;
  source: MemorySource;
  source_record_ids: string[];
  confidence: string;
  sensitivity: MemorySensitivity;
  user_confirmed: boolean;
  status: MemoryStatus;
  occurred_at: Date | null;
  valid_until: Date | null;
  first_seen_at: Date;
  last_seen_at: Date;
  occurrence_count: number;
  created_at: Date;
  updated_at: Date;
};

const returningColumns = `
  id, content, memory_kind, module, source, source_record_ids, confidence,
  sensitivity, user_confirmed, status, occurred_at, valid_until,
  first_seen_at, last_seen_at, occurrence_count, created_at, updated_at
`;

function mapMemory(row: MemoryRow): NexoMemory {
  return {
    id: row.id,
    content: row.content,
    kind: row.memory_kind,
    module: row.module,
    source: row.source,
    sourceRecordIds: row.source_record_ids,
    confidence: Number(row.confidence),
    sensitivity: row.sensitivity,
    userConfirmed: row.user_confirmed,
    status: row.status,
    occurredAt: row.occurred_at?.toISOString() ?? null,
    validUntil: row.valid_until?.toISOString() ?? null,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    occurrenceCount: row.occurrence_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function memoryFingerprint(input: {
  content: string;
  kind: MemoryKind;
  module: ContextTopic | null;
  source: MemorySource;
}): string {
  return createHash("sha256")
    .update(
      `${input.source}:${input.kind}:${input.module ?? "general"}:${input.content.toLocaleLowerCase("es-MX")}`,
    )
    .digest("hex");
}

export async function remember(input: {
  userId: string;
  content: string;
  kind: MemoryKind;
  module: ContextTopic | null;
  source: MemorySource;
  sourceRecordIds: string[];
  confidence: number;
  sensitivity: MemorySensitivity;
  userConfirmed: boolean;
  occurredAt?: string | null;
  validUntil?: string | null;
}): Promise<NexoMemory> {
  const result = await query<MemoryRow>(
    `INSERT INTO nexo_memories (
       id, nexo_user_id, content, memory_kind, module, source,
       source_record_ids, confidence, sensitivity, user_confirmed, status,
       fingerprint, occurred_at, valid_until, first_seen_at, last_seen_at,
       occurrence_count, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active',
       $11, $12, $13, NOW(), NOW(), 1, NOW(), NOW()
     )
     ON CONFLICT (nexo_user_id, fingerprint)
     DO UPDATE SET
       source_record_ids = (
         SELECT ARRAY(
           SELECT DISTINCT item
           FROM unnest(
             nexo_memories.source_record_ids || EXCLUDED.source_record_ids
           ) AS item
         )
       ),
       confidence = GREATEST(nexo_memories.confidence, EXCLUDED.confidence),
       user_confirmed =
         nexo_memories.user_confirmed OR EXCLUDED.user_confirmed,
       status = CASE
         WHEN EXCLUDED.user_confirmed THEN 'active'
         ELSE nexo_memories.status
       END,
       last_seen_at = NOW(),
       occurrence_count = nexo_memories.occurrence_count + 1,
       updated_at = NOW()
     RETURNING ${returningColumns}`,
    [
      randomUUID(),
      input.userId,
      input.content,
      input.kind,
      input.module,
      input.source,
      input.sourceRecordIds,
      input.confidence,
      input.sensitivity,
      input.userConfirmed,
      memoryFingerprint(input),
      input.occurredAt ?? null,
      input.validUntil ?? null,
    ],
  );
  return mapMemory(result.rows[0]!);
}

export async function listMemories(
  userId: string,
  filters: {
    kind?: MemoryKind;
    source?: MemorySource;
    status?: MemoryStatus;
    confirmed?: boolean;
  },
): Promise<NexoMemory[]> {
  const result = await query<MemoryRow>(
    `SELECT ${returningColumns}
     FROM nexo_memories
     WHERE nexo_user_id = $1
       AND ($2::TEXT IS NULL OR memory_kind = $2)
       AND ($3::TEXT IS NULL OR source = $3)
       AND ($4::TEXT IS NULL OR status = $4)
       AND ($5::BOOLEAN IS NULL OR user_confirmed = $5)
     ORDER BY user_confirmed ASC, updated_at DESC
     LIMIT 300`,
    [
      userId,
      filters.kind ?? null,
      filters.source ?? null,
      filters.status ?? "active",
      filters.confirmed ?? null,
    ],
  );
  return result.rows.map(mapMemory);
}

export async function reviewMemory(input: {
  id: string;
  userId: string;
  accepted: boolean;
}): Promise<NexoMemory | null> {
  const result = await query<MemoryRow>(
    `UPDATE nexo_memories
     SET user_confirmed = $3,
         status = CASE WHEN $3 THEN 'active' ELSE 'rejected' END,
         updated_at = NOW()
     WHERE id = $1 AND nexo_user_id = $2
     RETURNING ${returningColumns}`,
    [input.id, input.userId, input.accepted],
  );
  return result.rows[0] ? mapMemory(result.rows[0]) : null;
}
