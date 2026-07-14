import { DataTypes, Model } from "sequelize";

import { sequelize } from "../../shared/db/sequelize.js";

export class CalendarEvent extends Model {}

CalendarEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    start_at: { type: DataTypes.DATE, allowNull: false },
    end_at: { type: DataTypes.DATE, allowNull: true },
    location_name: { type: DataTypes.STRING, allowNull: true },
    repeat_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "none",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "scheduled",
    },
  },
  {
    sequelize,
    tableName: "calendar_events",
    underscored: true,
    timestamps: true,
  },
);
