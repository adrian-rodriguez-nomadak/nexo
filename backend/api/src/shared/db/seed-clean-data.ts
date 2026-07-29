import { pool } from "./database.js";
import { runCleanDataSeeder } from "./reset-data.js";

runCleanDataSeeder()
  .catch((error) => {
    if (error instanceof Error && error.message === "CONFIRMATION_REQUIRED") {
      console.error(
        "Operación cancelada. Ejecuta `npm run db:seed:clean -- --yes` para vaciar los datos de producto conservando usuarios y sesiones.",
      );
    } else {
      console.error("No fue posible ejecutar el seeder de limpieza.", error);
    }
    process.exitCode = 1;
  })
  .finally(() => pool.end());
