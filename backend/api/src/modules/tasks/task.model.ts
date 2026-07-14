import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class Task extends Model {}

Task.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "medium",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { sequelize, tableName: "tasks", underscored: true, timestamps: true },
);
