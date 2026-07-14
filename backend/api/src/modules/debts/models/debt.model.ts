import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../../shared/db/sequelize.js";

export class Debt extends Model {}

Debt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    pending_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "debts", underscored: true, timestamps: true },
);
