import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { Subscription } from "./subscription.model.js";

export const subscriptionsService = {
  health() {
    return moduleHealth("subscriptions");
  },

  async list() {
    return Subscription.findAll({
      where: { user_id: requireUserId() },
      order: [
        ["billing_day", "ASC"],
        ["created_at", "DESC"],
      ],
    });
  },

  async create(input: Record<string, unknown>) {
    return Subscription.create({ ...input, user_id: requireUserId() });
  },

  async update(id: string, input: Record<string, unknown>) {
    const subscription = await Subscription.findOne({
      where: { id, user_id: requireUserId() },
    });
    if (!subscription) return null;
    await subscription.update(input);
    return subscription;
  },

  async updateStatus(id: string, status: string) {
    return this.update(id, { status });
  },

  async remove(id: string) {
    const deleted = await Subscription.destroy({
      where: { id, user_id: requireUserId() },
    });
    return deleted > 0;
  },
};
