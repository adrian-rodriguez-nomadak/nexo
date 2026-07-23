import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./shared/db/database.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Nexo API listening on port ${env.PORT}.`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Closing Nexo API.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
