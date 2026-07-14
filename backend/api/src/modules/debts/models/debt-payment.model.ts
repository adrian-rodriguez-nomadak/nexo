import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../../shared/db/sequelize.js";

export class DebtPayment extends Model {}

DebtPayment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    debt_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    payment_date: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "debt_payments",
    underscored: true,
    timestamps: true,
  },
);
