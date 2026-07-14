import { z } from "zod";

export const syncPushSchema = z.object({
  device_id: z.string().min(1).max(100),
  batch_id: z.string().uuid(),
  changes: z.array(z.object({
    operation_id: z.string().uuid(),
    entity: z.enum(["finance_movement", "upcoming_payment", "subscription", "debt", "debt_payment", "calendar_event", "task", "reminder", "inbox_action"]),
    record_id: z.string().min(1).max(100),
    operation: z.enum(["upsert", "delete"]),
    base_version: z.number().int().nonnegative(),
    client_updated_at: z.string().datetime(),
    payload: z.record(z.unknown()).optional(),
  })).min(1).max(200),
});

export const syncPullSchema = z.object({
  cursor: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});
