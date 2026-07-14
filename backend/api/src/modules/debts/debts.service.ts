import { sequelize } from "../../shared/db/sequelize.js";
import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { DebtPayment } from "./models/debt-payment.model.js";
import { Debt } from "./models/debt.model.js";

export const debtsService = {
  health() {
    return moduleHealth("debts");
  },

  async list() {
    return Debt.findAll({
      where: { user_id: requireUserId() },
      order: [["created_at", "DESC"]],
    });
  },

  async create(input: Record<string, unknown>) {
    return Debt.create({
      ...input,
      pending_amount: input.pending_amount ?? input.total_amount,
      user_id: requireUserId(),
    });
  },

  async update(id: string, input: Record<string, unknown>) {
    const debt = await Debt.findOne({ where: { id, user_id: requireUserId() } });
    if (!debt) return null;
    await debt.update(input);
    return debt;
  },

  async remove(id: string) {
    const deleted = await Debt.destroy({
      where: { id, user_id: requireUserId() },
    });
    return deleted > 0;
  },

  async addPayment(id: string, input: Record<string, unknown>) {
    return sequelize.transaction(async (transaction) => {
      const debt = await Debt.findOne({
        where: { id, user_id: requireUserId() },
        transaction,
      });
      if (!debt) return null;

      const payment = await DebtPayment.create(
        { ...input, debt_id: id },
        { transaction },
      );
      const pendingAmount =
        Number(debt.get("pending_amount")) - Number(input.amount ?? 0);
      await debt.update(
        {
          pending_amount: Math.max(pendingAmount, 0),
          status: pendingAmount <= 0 ? "paid" : "pending",
        },
        { transaction },
      );

      return { debt, payment };
    });
  },
};
