import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const captures = sqliteTable(
  "captures",
  {
    id: text("id").primaryKey(),
    module: text("module").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
    occurredAt: text("occurred_at"),
    amountCents: integer("amount_cents"),
  },
  (table) => [
    index("captures_created_at_idx").on(table.createdAt),
    index("captures_module_idx").on(table.module),
  ],
);
