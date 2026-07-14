import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: true },
    pin_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    biometric_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    budget_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "biweekly",
    },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "MXN" },
  },
  {
    sequelize,
    tableName: "users",
    underscored: true,
    timestamps: true,
  },
);
