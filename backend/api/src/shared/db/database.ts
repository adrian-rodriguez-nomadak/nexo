import { Pool, type QueryResultRow } from "pg";

import { env, requireDatabaseUrl } from "../../config/env.js";

export const pool = new Pool({
  connectionString: requireDatabaseUrl(),
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  return pool.query<T>(text, [...values]);
}
