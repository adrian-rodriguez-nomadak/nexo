import { Op } from "sequelize";

import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { CalendarEvent } from "./calendar-event.model.js";

export const calendarService = {
  health() {
    return moduleHealth("calendar");
  },

  async list(query: { from?: string; to?: string }) {
    const startFilter =
      query.from || query.to
        ? {
            start_at: {
              ...(query.from ? { [Op.gte]: new Date(query.from) } : {}),
              ...(query.to ? { [Op.lte]: new Date(query.to) } : {}),
            },
          }
        : {};

    return CalendarEvent.findAll({
      where: { user_id: requireUserId(), ...startFilter },
      order: [["start_at", "ASC"]],
    });
  },

  async create(input: Record<string, unknown>) {
    return CalendarEvent.create({ ...input, user_id: requireUserId() });
  },

  async update(id: string, input: Record<string, unknown>) {
    const event = await CalendarEvent.findOne({
      where: { id, user_id: requireUserId() },
    });
    if (!event) return null;
    await event.update(input);
    return event;
  },

  async updateStatus(id: string, status: string) {
    return this.update(id, { status });
  },

  async remove(id: string) {
    const deleted = await CalendarEvent.destroy({
      where: { id, user_id: requireUserId() },
    });
    return deleted > 0;
  },
};
