CREATE TABLE `captures` (
	`id` text PRIMARY KEY NOT NULL,
	`module` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`occurred_at` text,
	`amount_cents` integer
);
--> statement-breakpoint
CREATE INDEX `captures_created_at_idx` ON `captures` (`created_at`);--> statement-breakpoint
CREATE INDEX `captures_module_idx` ON `captures` (`module`);