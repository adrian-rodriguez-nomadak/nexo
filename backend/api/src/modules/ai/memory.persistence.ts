import { QueryTypes } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";
import type { MemoryAnalysis } from "./ai.service.js";

export async function loadMemoryContext(ownerKey: string) {
  const rows = await sequelize.query<{
    compressed_summary: string;
    known_facts: string[];
    recurring_patterns: string[];
  }>(
    `SELECT compressed_summary, known_facts, recurring_patterns
     FROM memory_profiles WHERE owner_key = :ownerKey LIMIT 1`,
    {
      replacements: { ownerKey },
      type: QueryTypes.SELECT,
    },
  );
  const context = rows[0];
  if (!context) return null;
  return {
    compressedSummary: context.compressed_summary,
    knownFacts: context.known_facts,
    recurringPatterns: context.recurring_patterns,
  };
}

export async function persistMemoryContext(
  ownerKey: string,
  context: MemoryAnalysis["context_update"],
) {
  await sequelize.query(
    `INSERT INTO memory_profiles (
      owner_key, compressed_summary, known_facts, recurring_patterns
    ) VALUES (
      :ownerKey, :compressedSummary, CAST(:knownFacts AS jsonb),
      CAST(:recurringPatterns AS jsonb)
    )
    ON CONFLICT (owner_key) DO UPDATE SET
      compressed_summary = EXCLUDED.compressed_summary,
      known_facts = EXCLUDED.known_facts,
      recurring_patterns = EXCLUDED.recurring_patterns,
      updated_at = now()`,
    {
      replacements: {
        ownerKey,
        compressedSummary: context.compressed_summary,
        knownFacts: JSON.stringify(context.known_facts),
        recurringPatterns: JSON.stringify(context.recurring_patterns),
      },
    },
  );
}

export async function persistMemoryNote(input: {
  id: string;
  ownerKey: string;
  rawText: string;
  summary: string;
  analysis: unknown;
  details: Record<string, string>;
  tags: string[];
  occurredAt: string;
}) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `INSERT INTO memory_profiles (owner_key)
       VALUES (:ownerKey)
       ON CONFLICT (owner_key) DO NOTHING`,
      { replacements: { ownerKey: input.ownerKey }, transaction },
    );
    await sequelize.query(
      `INSERT INTO memory_notes (
        id, owner_key, raw_text, summary, analysis, details, tags, occurred_at
      ) VALUES (
        :id, :ownerKey, :rawText, :summary, CAST(:analysis AS jsonb),
        CAST(:details AS jsonb), CAST(:tags AS jsonb), :occurredAt
      )
      ON CONFLICT (id) DO UPDATE SET
        raw_text = EXCLUDED.raw_text,
        summary = EXCLUDED.summary,
        analysis = EXCLUDED.analysis,
        details = EXCLUDED.details,
        tags = EXCLUDED.tags,
        occurred_at = EXCLUDED.occurred_at,
        updated_at = now()
      WHERE memory_notes.owner_key = EXCLUDED.owner_key`,
      {
        replacements: {
          id: input.id,
          ownerKey: input.ownerKey,
          rawText: input.rawText,
          summary: input.summary,
          analysis: JSON.stringify(input.analysis ?? null),
          details: JSON.stringify(input.details),
          tags: JSON.stringify(input.tags),
          occurredAt: input.occurredAt,
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
  });
}
