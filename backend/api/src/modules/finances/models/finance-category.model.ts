import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../../shared/db/sequelize.js";

export class FinanceCategory extends Model {}

FinanceCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    color: { type: DataTypes.STRING, allowNull: true },
    icon: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: "finance_categories",
    underscored: true,
    timestamps: true,
  },
);
