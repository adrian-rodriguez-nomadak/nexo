import { Op } from "sequelize";

import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { FinanceMovement } from "./models/finance-movement.model.js";
import { UpcomingPayment } from "./models/upcoming-payment.model.js";

type MovementInput = {
  type: "income" | "expense";
  amount: number;
  category_id?: string;
  description?: string;
  movement_date: string;
  payment_method?: string;
};

type UpcomingPaymentInput = {
  name: string;
  amount: number;
  due_date: string;
  category?: string;
  repeat_type: "none" | "weekly" | "monthly" | "yearly";
  notes?: string;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export const financesService = {
  health() {
    return moduleHealth("finances");
  },

  async getSummary() {
    const movements = await FinanceMovement.findAll({
      where: { user_id: requireUserId() },
    });
    const pendingPayments = await UpcomingPayment.findAll({
      where: { user_id: requireUserId(), status: "pending" },
    });

    const totalIncome = movements
      .filter((movement) => movement.get("type") === "income")
      .reduce((total, movement) => total + toNumber(movement.get("amount")), 0);
    const totalExpenses = movements
      .filter((movement) => movement.get("type") === "expense")
      .reduce((total, movement) => total + toNumber(movement.get("amount")), 0);
    const upcomingPayments = pendingPayments.reduce(
      (total, payment) => total + toNumber(payment.get("amount")),
      0,
    );
    const availableReal = totalIncome - totalExpenses - upcomingPayments;

    return {
      totalIncome,
      totalExpenses,
      upcomingPayments,
      availableReal,
      dailyRecommended: Math.max(
        Math.round((availableReal / 14) * 100) / 100,
        0,
      ),
    };
  },

  async listMovements(query: {
    type?: "income" | "expense";
    limit?: number;
    offset?: number;
  }) {
    return FinanceMovement.findAll({
      where: {
        user_id: requireUserId(),
        ...(query.type ? { type: query.type } : {}),
      },
      order: [
        ["movement_date", "DESC"],
        ["created_at", "DESC"],
      ],
      limit: query.limit,
      offset: query.offset,
    });
  },

  async createMovement(input: MovementInput) {
    return FinanceMovement.create({ ...input, user_id: requireUserId() });
  },

  async listUpcomingPayments() {
    return UpcomingPayment.findAll({
      where: { user_id: requireUserId() },
      order: [
        ["due_date", "ASC"],
        ["created_at", "DESC"],
      ],
    });
  },

  async createUpcomingPayment(input: UpcomingPaymentInput) {
    return UpcomingPayment.create({ ...input, user_id: requireUserId() });
  },

  async updateUpcomingPaymentStatus(id: string, status: string) {
    const payment = await UpcomingPayment.findOne({
      where: { id, user_id: requireUserId() },
    });
    if (!payment) return null;

    await payment.update({ status });
    return payment;
  },

  async upcomingDueBetween(from: Date, to: Date) {
    return UpcomingPayment.findAll({
      where: {
        user_id: requireUserId(),
        status: "pending",
        due_date: { [Op.between]: [from, to] },
      },
    });
  },
};
