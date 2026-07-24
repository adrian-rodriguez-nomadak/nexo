import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";

export type NexoEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  createdAt: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: Date;
  ends_at: Date | null;
  all_day: boolean;
  created_at: Date;
};

function mapEvent(row: EventRow): NexoEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    allDay: row.all_day,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listEvents(userId: string): Promise<NexoEvent[]> {
  const result = await query<EventRow>(
    `SELECT
       id,
       title,
       description,
       location,
       starts_at,
       ends_at,
       all_day,
       created_at
     FROM nexo_events
     WHERE nexo_user_id = $1
     ORDER BY
       (starts_at >= NOW()) DESC,
       CASE WHEN starts_at >= NOW() THEN starts_at END ASC,
       CASE WHEN starts_at < NOW() THEN starts_at END DESC
     LIMIT 300`,
    [userId],
  );

  return result.rows.map(mapEvent);
}

export async function createEvent(input: {
  userId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
}): Promise<NexoEvent> {
  const result = await query<EventRow>(
    `INSERT INTO nexo_events (
       id,
       nexo_user_id,
       title,
       description,
       location,
       starts_at,
       ends_at,
       all_day,
       created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING
       id,
       title,
       description,
       location,
       starts_at,
       ends_at,
       all_day,
       created_at`,
    [
      randomUUID(),
      input.userId,
      input.title,
      input.description,
      input.location,
      input.startsAt,
      input.endsAt,
      input.allDay,
    ],
  );

  return mapEvent(result.rows[0]!);
}

export async function deleteEvent(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    "DELETE FROM nexo_events WHERE id = $1 AND nexo_user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
