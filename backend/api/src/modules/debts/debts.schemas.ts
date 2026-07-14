import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createDebtSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["i_owe", "they_owe_me"]),
  total_amount: z.coerce.number().positive(),
  pending_amount: z.coerce.number().nonnegative().optional(),
  due_date: z.string().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

export const updateDebtSchema = createDebtSchema.partial();

export const createDebtPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_date: z.string().min(1),
  notes: z.string().trim().min(1).optional(),
});
