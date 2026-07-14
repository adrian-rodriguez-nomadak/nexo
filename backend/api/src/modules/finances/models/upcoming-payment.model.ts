import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../../shared/db/sequelize.js";

export class UpcomingPayment extends Model {}

UpcomingPayment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    repeat_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "none",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "upcoming_payments",
    underscored: true,
    timestamps: true,
  },
);
