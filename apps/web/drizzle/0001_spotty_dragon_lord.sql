CREATE TABLE `finance_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text DEFAULT 'MXN' NOT NULL,
	`initial_balance_cents` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `finance_accounts_created_at_idx` ON `finance_accounts` (`created_at`);--> statement-breakpoint
CREATE TABLE `finance_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `finance_accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `finance_transactions_account_idx` ON `finance_transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `finance_transactions_occurred_at_idx` ON `finance_transactions` (`occurred_at`);