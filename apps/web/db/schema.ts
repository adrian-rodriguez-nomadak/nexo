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

export const financeAccounts = sqliteTable(
  "finance_accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    currency: text("currency").notNull().default("MXN"),
    initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("finance_accounts_created_at_idx").on(table.createdAt),
  ],
);

export const financeTransactions = sqliteTable(
  "finance_transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    occurredAt: text("occurred_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("finance_transactions_account_idx").on(table.accountId),
    index("finance_transactions_occurred_at_idx").on(table.occurredAt),
  ],
);
