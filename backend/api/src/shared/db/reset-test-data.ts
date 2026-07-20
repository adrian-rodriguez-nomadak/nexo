import { QueryTypes } from "sequelize";

import { sequelize } from "./sequelize.js";

if (process.env.RESET_DATABASE !== "YES_I_UNDERSTAND") {
  throw new Error(
    "Refusing to erase data. Set RESET_DATABASE=YES_I_UNDERSTAND to continue.",
  );
}

try {
  await sequelize.authenticate();
  const tables = await sequelize.query<{ tablename: string }>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename <> 'schema_migrations'
     ORDER BY tablename`,
    { type: QueryTypes.SELECT },
  );
  if (tables.length === 0) {
    console.log("No application tables found.");
  } else {
    const identifiers = tables
      .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
      .join(", ");
    await sequelize.query(
      `TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`,
    );
    console.log(
      `First-test reset complete. Cleared ${tables.length} tables; migrations were preserved.`,
    );
  }
} finally {
  await sequelize.close();
}
