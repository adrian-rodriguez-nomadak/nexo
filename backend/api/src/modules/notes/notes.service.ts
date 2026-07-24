import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";

export type NexoNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapNote(row: NoteRow): NexoNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags,
    isPinned: row.is_pinned,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listNotes(userId: string): Promise<NexoNote[]> {
  const result = await query<NoteRow>(
    `SELECT
       id,
       title,
       content,
       tags,
       is_pinned,
       created_at,
       updated_at
     FROM nexo_notes
     WHERE nexo_user_id = $1
     ORDER BY is_pinned DESC, updated_at DESC
     LIMIT 500`,
    [userId],
  );

  return result.rows.map(mapNote);
}

export async function createNote(input: {
  userId: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
}): Promise<NexoNote> {
  const result = await query<NoteRow>(
    `INSERT INTO nexo_notes (
       id,
       nexo_user_id,
       title,
       content,
       tags,
       is_pinned,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING
       id,
       title,
       content,
       tags,
       is_pinned,
       created_at,
       updated_at`,
    [
      randomUUID(),
      input.userId,
      input.title,
      input.content,
      input.tags,
      input.isPinned,
    ],
  );

  return mapNote(result.rows[0]!);
}

export async function updateNote(input: {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
}): Promise<NexoNote | null> {
  const result = await query<NoteRow>(
    `UPDATE nexo_notes
     SET
       title = $3,
       content = $4,
       tags = $5,
       is_pinned = $6,
       updated_at = NOW()
     WHERE id = $1 AND nexo_user_id = $2
     RETURNING
       id,
       title,
       content,
       tags,
       is_pinned,
       created_at,
       updated_at`,
    [
      input.id,
      input.userId,
      input.title,
      input.content,
      input.tags,
      input.isPinned,
    ],
  );

  return result.rows[0] ? mapNote(result.rows[0]) : null;
}

export async function deleteNote(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    "DELETE FROM nexo_notes WHERE id = $1 AND nexo_user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
