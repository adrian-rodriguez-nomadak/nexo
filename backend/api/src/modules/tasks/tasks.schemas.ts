import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  due_date: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high"]),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]),
});
