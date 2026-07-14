import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class SyncChange extends Model {}

SyncChange.init(
  {
    sequence: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    batch_id: { type: DataTypes.UUID, allowNull: false },
    operation_id: { type: DataTypes.UUID, allowNull: false },
    entity: { type: DataTypes.STRING(40), allowNull: false },
    record_id: { type: DataTypes.STRING(100), allowNull: false },
    operation: { type: DataTypes.ENUM("upsert", "delete"), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: true },
    changed_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "sync_changes",
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ["user_id", "operation_id"] },
      { fields: ["user_id", "sequence"] },
    ],
  },
);
