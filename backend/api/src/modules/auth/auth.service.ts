import {
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { env } from "../../config/env.js";
import { query } from "../../shared/db/database.js";
import { hashSessionToken } from "./auth.utils.js";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

type UserRow = {
  id: string;
  email: string;
  display_name: string;
};

export function isValidExchangeSecret(value: unknown): boolean {
  if (
    typeof value !== "string" ||
    !env.AUTH_EXCHANGE_SECRET ||
    value.length !== env.AUTH_EXCHANGE_SECRET.length
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(value, "utf8"),
    Buffer.from(env.AUTH_EXCHANGE_SECRET, "utf8"),
  );
}

export async function createSessionForIdentity(input: {
  email: string;
  displayName: string;
}): Promise<{ token: string; user: AuthUser; expiresAt: string }> {
  const userResult = await query<UserRow>(
    `INSERT INTO nexo_users (id, email, display_name, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (email)
     DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
     RETURNING id, email, display_name`,
    [randomUUID(), input.email, input.displayName],
  );
  const userRow = userResult.rows[0]!;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await query("DELETE FROM nexo_auth_sessions WHERE expires_at <= NOW()");
  await query(
    `INSERT INTO nexo_auth_sessions (
      id, user_id, token_hash, expires_at, created_at
    ) VALUES ($1, $2, $3, $4, NOW())`,
    [randomUUID(), userRow.id, hashSessionToken(token), expiresAt],
  );

  return {
    token,
    user: {
      id: userRow.id,
      email: userRow.email,
      displayName: userRow.display_name,
    },
    expiresAt: expiresAt.toISOString(),
  };
}

export async function findUserBySessionToken(
  token: string,
): Promise<AuthUser | null> {
  const result = await query<UserRow>(
    `SELECT u.id, u.email, u.display_name
     FROM nexo_auth_sessions s
     INNER JOIN nexo_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

export async function revokeSession(token: string): Promise<void> {
  await query("DELETE FROM nexo_auth_sessions WHERE token_hash = $1", [
    hashSessionToken(token),
  ]);
}
