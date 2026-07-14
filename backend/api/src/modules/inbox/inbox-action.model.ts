import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class InboxAction extends Model {}

InboxAction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: true },
    raw_text: { type: DataTypes.TEXT, allowNull: false },
    detected_intent: { type: DataTypes.STRING, allowNull: false },
    structured_payload: { type: DataTypes.JSONB, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
  },
  {
    sequelize,
    tableName: "inbox_actions",
    underscored: true,
    timestamps: true,
  },
);
