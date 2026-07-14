import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class SyncRecord extends Model {}

SyncRecord.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    entity: { type: DataTypes.STRING(40), allowNull: false },
    record_id: { type: DataTypes.STRING(100), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    payload: { type: DataTypes.JSONB, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    client_updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "sync_records",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["user_id", "entity", "record_id"] }],
  },
);
