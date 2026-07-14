import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createReminderSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  remind_at: z.string().min(1),
  repeat_type: z.enum(["none", "daily", "weekly", "monthly", "yearly"]),
});

export const updateReminderSchema = createReminderSchema.partial();

export const updateReminderStatusSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]),
});
