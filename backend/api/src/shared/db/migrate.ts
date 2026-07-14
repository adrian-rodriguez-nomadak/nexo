import "dotenv/config";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QueryTypes } from "sequelize";

import { sequelize } from "./sequelize.js";

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../migrations",
);

try {
  await sequelize.authenticate();
  await sequelize.query("SELECT pg_advisory_lock(hashtext('nexo_migrations'))");
  await sequelize.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const files = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  const applied = await sequelize.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations",
    { type: QueryTypes.SELECT },
  );
  const appliedFiles = new Set(applied.map((row) => row.filename));

  for (const filename of files) {
    if (appliedFiles.has(filename)) continue;
    const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");
    await sequelize.query(sql);
    await sequelize.query(
      "INSERT INTO schema_migrations (filename) VALUES (:filename)",
      { replacements: { filename } },
    );
    console.log(`Applied ${filename}`);
  }

  console.log("Database migrations are up to date.");
} finally {
  await sequelize.query("SELECT pg_advisory_unlock(hashtext('nexo_migrations'))").catch(() => undefined);
  await sequelize.close();
}
