import { sequelize } from "../shared/db/sequelize.js";

export async function connectDatabase() {
  await sequelize.authenticate();
}
