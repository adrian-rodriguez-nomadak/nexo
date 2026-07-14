import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../../shared/db/sequelize.js";

export class FinanceMovement extends Model {}

FinanceMovement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    category_id: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    movement_date: { type: DataTypes.DATEONLY, allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: "finance_movements",
    underscored: true,
    timestamps: true,
  },
);
