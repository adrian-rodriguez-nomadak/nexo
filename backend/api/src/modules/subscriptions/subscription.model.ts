import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class Subscription extends Model {}

Subscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    billing_day: { type: DataTypes.INTEGER, allowNull: false },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "monthly",
    },
    category: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "subscriptions",
    underscored: true,
    timestamps: true,
  },
);
