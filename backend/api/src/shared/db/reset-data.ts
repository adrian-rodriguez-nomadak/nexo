import { pool } from "./database.js";

const dataTables = [
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
    await client.query(`TRUNCATE TABLE ${dataTables.join(", ")} CASCADE`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
if (process.argv[1]?.endsWith("reset-data.js")) {
  if (!process.argv.includes("--yes")) {
    console.error(
      "Operación cancelada. Ejecuta `npm run db:reset-data -- --yes` para borrar todos los datos de producto conservando usuarios y sesiones.",
    );
    process.exitCode = 1;
  } else {
    resetUserData()
      .then(() => {
        console.log(
          `Datos eliminados de ${dataTables.length} tablas. Usuarios y sesiones conservados.`,
        );
      })
      .catch((error) => {
        console.error("No fue posible limpiar los datos.", error);
        process.exitCode = 1;
      })
      .finally(() => pool.end());
  }
}
