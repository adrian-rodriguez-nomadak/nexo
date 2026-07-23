import "dotenv/config";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT debe ser un número válido.");
  }
  return port;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parsePort(process.env.PORT),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  DATABASE_SSL: parseBoolean(process.env.DATABASE_SSL, false),
  CORS_ORIGINS: (
    process.env.CORS_ORIGIN ??
    "http://localhost:3000,https://nexo-personal.ample-gleam-3843.chatgpt.site"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
  }
  return env.DATABASE_URL;
}
