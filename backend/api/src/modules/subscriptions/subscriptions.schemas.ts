import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  billing_day: z.coerce.number().int().min(1).max(31),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  category: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(["active", "paused", "cancelled"]),
});
