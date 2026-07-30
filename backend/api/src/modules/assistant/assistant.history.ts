import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type { AssistantHistoryMessage } from "./assistant.validation.js";

export type StoredAssistantMessage = AssistantHistoryMessage & {
  id: string;
  attachments: string[];
  createdAt: string;
};

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: string[];
  created_at: Date;
};

function mapMessage(row: MessageRow): StoredAssistantMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    attachments: row.attachments,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listAssistantMessages(
  userId: string,
  limit = 100,
): Promise<StoredAssistantMessage[]> {
  const result = await query<MessageRow>(
    `SELECT id, role, content, attachments, created_at
     FROM (
       SELECT id, role, content, attachments, created_at
       FROM nexo_assistant_messages
       WHERE nexo_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) recent
     ORDER BY created_at ASC`,
    [userId, limit],
  );
  return result.rows.map(mapMessage);
}

export async function saveAssistantMessage(input: {
  userId: string;
  role: "user" | "assistant";
  content: string;
  attachments?: string[];
}): Promise<StoredAssistantMessage> {
  const result = await query<MessageRow>(
    `INSERT INTO nexo_assistant_messages (
       id, nexo_user_id, role, content, attachments
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, role, content, attachments, created_at`,
    [
      randomUUID(),
      input.userId,
      input.role,
      input.content,
      input.attachments ?? [],
    ],
  );
  return mapMessage(result.rows[0]!);
}

export async function clearAssistantMessages(userId: string): Promise<number> {
  const result = await query(
    `DELETE FROM nexo_assistant_messages
     WHERE nexo_user_id = $1`,
    [userId],
  );
  return result.rowCount ?? 0;
}
