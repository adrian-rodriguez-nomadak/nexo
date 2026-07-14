import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { Reminder } from "./reminder.model.js";

export const remindersService = {
  health() {
    return moduleHealth("reminders");
  },

  async list() {
    return Reminder.findAll({
      where: { user_id: requireUserId() },
      order: [["remind_at", "ASC"]],
    });
  },

  async create(input: Record<string, unknown>) {
    return Reminder.create({ ...input, user_id: requireUserId() });
  },

  async update(id: string, input: Record<string, unknown>) {
    const reminder = await Reminder.findOne({
      where: { id, user_id: requireUserId() },
    });
    if (!reminder) return null;
    await reminder.update(input);
    return reminder;
  },

  async updateStatus(id: string, status: string) {
    return this.update(id, { status });
  },

  async remove(id: string) {
    const deleted = await Reminder.destroy({
      where: { id, user_id: requireUserId() },
    });
    return deleted > 0;
  },
};
