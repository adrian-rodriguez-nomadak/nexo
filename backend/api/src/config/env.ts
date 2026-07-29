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

const BUILT_IN_CORS_ORIGINS = [
  "http://localhost:3000",
  "https://nexo-personal.ample-gleam-3843.chatgpt.site",
  "https://nexo-chi-nine.vercel.app",
];

export function parseCorsOrigins(value: string | undefined): string[] {
  const configuredOrigins = value?.split(",") ?? [];
  const normalizedOrigins = [...BUILT_IN_CORS_ORIGINS, ...configuredOrigins]
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => (origin === "*" ? origin : origin.replace(/\/+$/, "")));

  return [...new Set(normalizedOrigins)];
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parsePort(process.env.PORT),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  DATABASE_SSL: parseBoolean(process.env.DATABASE_SSL, false),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGIN),
  AUTH_EXCHANGE_SECRET:
    process.env.AUTH_EXCHANGE_SECRET ?? process.env.JWT_SECRET ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OPENAI_ASSISTANT_MODEL:
    process.env.OPENAI_ASSISTANT_MODEL ?? process.env.OPENAI_VISION_MODEL ?? "gpt-5.6-sol",
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL ?? "gpt-5.6-sol",
  NEXO_TEXT_API_URL:
    process.env.NEXO_TEXT_API_URL ?? "https://api.groq.com/openai/v1",
  NEXO_TEXT_API_KEY: process.env.NEXO_TEXT_API_KEY ?? "",
  NEXO_TEXT_MODEL: process.env.NEXO_TEXT_MODEL ?? "llama-3.1-8b-instant",
  NEXO_TEXT_PROVIDER: process.env.NEXO_TEXT_PROVIDER ?? "groq",
  OMI_API_KEY: process.env.OMI_API_KEY ?? "",
};

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
  }
  return env.DATABASE_URL;
}
