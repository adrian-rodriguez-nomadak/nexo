import { app } from "./app.js";
import { env } from "./config/env.js";
import "./shared/db/models.js";
import { sequelize } from "./shared/db/sequelize.js";

await sequelize.authenticate();

if (env.nodeEnv === "development" && env.dbSync) {
  await sequelize.sync({ alter: true });
  console.log("Database synchronized with alter=true for development.");
}

app.listen(env.port, () => {
  console.log(`Nexo API listening on http://localhost:${env.port}`);
});
