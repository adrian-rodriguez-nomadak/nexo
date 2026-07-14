import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class Reminder extends Model {}

Reminder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    remind_at: { type: DataTypes.DATE, allowNull: false },
    repeat_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "none",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { sequelize, tableName: "reminders", underscored: true, timestamps: true },
);
