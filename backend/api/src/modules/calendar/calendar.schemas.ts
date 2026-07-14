import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listEventsQuerySchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

export const createCalendarEventSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  start_at: z.string().min(1),
  end_at: z.string().min(1).optional(),
  location_name: z.string().trim().min(1).optional(),
  repeat_type: z.enum(["none", "daily", "weekly", "monthly", "yearly"]),
});

export const updateCalendarEventSchema = createCalendarEventSchema.partial();

export const updateCalendarEventStatusSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled"]),
});
