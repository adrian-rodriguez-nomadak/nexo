import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { Task } from "./task.model.js";

export const tasksService = {
  health() {
    return moduleHealth("tasks");
  },

  async list() {
    return Task.findAll({
      where: { user_id: requireUserId() },
      order: [
        ["due_date", "ASC"],
        ["created_at", "DESC"],
      ],
    });
  },

  async create(input: Record<string, unknown>) {
    return Task.create({ ...input, user_id: requireUserId() });
  },

  async update(id: string, input: Record<string, unknown>) {
    const task = await Task.findOne({ where: { id, user_id: requireUserId() } });
    if (!task) return null;
    await task.update(input);
    return task;
  },

  async updateStatus(id: string, status: string) {
    return this.update(id, { status });
  },

  async remove(id: string) {
    const deleted = await Task.destroy({
      where: { id, user_id: requireUserId() },
    });
    return deleted > 0;
  },
};
