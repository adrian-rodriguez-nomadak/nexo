import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import { env } from "../../config/env.js";
import { query } from "../../shared/db/database.js";
import { hashSessionToken } from "./auth.utils.js";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;
const scrypt = promisify(scryptCallback);
const dummyPasswordSalt = randomBytes(16).toString("hex");

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

type CredentialUserRow = UserRow & {
  password_hash: string | null;
  password_salt: string | null;
};

export class EmailAlreadyRegisteredError extends Error {}

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
  return createSessionForUser(userResult.rows[0]!);
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const derivedKey = (await scrypt(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;
  return derivedKey.toString("hex");
}

async function createSessionForUser(
  userRow: UserRow,
): Promise<{ token: string; user: AuthUser; expiresAt: string }> {
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

export async function registerWithCredentials(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<{ token: string; user: AuthUser; expiresAt: string }> {
  const existing = await query<{ id: string }>(
    "SELECT id FROM nexo_users WHERE email = $1 LIMIT 1",
    [input.email],
  );
  if (existing.rows[0]) throw new EmailAlreadyRegisteredError();

  const salt = randomBytes(16).toString("hex");
  const hash = await passwordHash(input.password, salt);

  try {
    const result = await query<UserRow>(
      `INSERT INTO nexo_users (
         id, email, display_name, password_hash, password_salt, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, display_name`,
      [randomUUID(), input.email, input.displayName, hash, salt],
    );
    return createSessionForUser(result.rows[0]!);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new EmailAlreadyRegisteredError();
    }
    throw error;
  }
}

export async function loginWithCredentials(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser; expiresAt: string } | null> {
  const result = await query<CredentialUserRow>(
    `SELECT id, email, display_name, password_hash, password_salt
     FROM nexo_users
     WHERE email = $1
     LIMIT 1`,
    [input.email],
  );
  const row = result.rows[0];
  const salt = row?.password_salt ?? dummyPasswordSalt;
  const candidateHash = await passwordHash(input.password, salt);

  if (!row?.password_hash || !row.password_salt) return null;
  const expected = Buffer.from(row.password_hash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");
  if (
    expected.length !== candidate.length ||
    !timingSafeEqual(expected, candidate)
  ) {
    return null;
  }

  return createSessionForUser(row);
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
