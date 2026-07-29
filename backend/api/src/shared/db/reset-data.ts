import { pool } from "./database.js";

export const productDataTables = [
  "nexo_assistant_actions",
  "nexo_assistant_messages",
  "nexo_bet_selections",
  "nexo_bets",
  "nexo_bet_settings",
  "nexo_meals",
  "nexo_workout_exercises",
  "nexo_workouts",
  "nexo_health_entries",
  "nexo_health_profiles",
  "nexo_events",
  "nexo_notes",
  "nexo_memories",
  "finance_transactions",
  "finance_accounts",
  "captures",
] as const;

export async function resetUserData(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `TRUNCATE TABLE ${productDataTables.join(", ")} RESTART IDENTITY CASCADE`,
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function runCleanDataSeeder(): Promise<void> {
  if (!process.argv.includes("--yes")) {
    throw new Error(
      "CONFIRMATION_REQUIRED",
    );
  }
  await resetUserData();
  console.log(
    `Seeder completado: ${productDataTables.length} tablas de producto vaciadas. Usuarios, credenciales, sesiones y migraciones conservados.`,
  );
}

if (process.argv[1]?.endsWith("reset-data.js")) {
  runCleanDataSeeder()
    .catch((error) => {
      if (error instanceof Error && error.message === "CONFIRMATION_REQUIRED") {
        console.error(
          "Operación cancelada. Agrega `--yes` para borrar los datos de producto.",
        );
      } else {
        console.error("No fue posible limpiar los datos.", error);
      }
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
