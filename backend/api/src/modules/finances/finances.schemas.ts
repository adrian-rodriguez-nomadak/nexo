import { z } from "zod";

const dateString = z.string().min(1);

export const listMovementsQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const createMovementSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive(),
  category_id: z.string().uuid().optional(),
  description: z.string().trim().min(1).optional(),
  movement_date: dateString,
  payment_method: z.string().trim().min(1).optional(),
});

export const createUpcomingPaymentSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  due_date: dateString,
  category: z.string().trim().min(1).optional(),
  repeat_type: z.enum(["none", "weekly", "monthly", "yearly"]),
  notes: z.string().trim().min(1).optional(),
});

export const updateUpcomingPaymentStatusSchema = z.object({
  status: z.enum(["pending", "paid", "cancelled"]),
});

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});
