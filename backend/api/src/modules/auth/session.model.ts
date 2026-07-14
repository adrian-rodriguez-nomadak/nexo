import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class Session extends Model {
  declare id: string;
  declare user_id: string;
  declare refresh_token_hash: string;
  declare token_family: string;
  declare expires_at: Date;
  declare revoked_at: Date | null;
}

Session.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    refresh_token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    token_family: { type: DataTypes.UUID, allowNull: false },
    device_name: { type: DataTypes.STRING, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "sessions", underscored: true, timestamps: true },
);
