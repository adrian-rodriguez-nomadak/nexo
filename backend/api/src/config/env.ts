import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/nexo_db",
  jwtSecret: process.env.JWT_SECRET ?? "change_me",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 30),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "change_me",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
  apiFootballKey: process.env.API_FOOTBALL_KEY ?? "",
  apiFootballLeagueId: Number(process.env.API_FOOTBALL_LIGA_MX_ID ?? 262),
  apiFootballSeason: Number(
    process.env.API_FOOTBALL_SEASON ?? new Date().getUTCFullYear(),
  ),
  sportsDbApiKey: process.env.SPORTSDB_API_KEY ?? "123",
  sportsDbLigaMxId: process.env.SPORTSDB_LIGA_MX_ID ?? "4350",
  sportsDemoMode: process.env.SPORTS_DEMO_MODE !== "false",
  dbSync: process.env.DB_SYNC === "true",
  corsOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
