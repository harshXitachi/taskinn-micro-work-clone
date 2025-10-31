CREATE TABLE `admin_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text DEFAULT 'admin' NOT NULL,
	`password_hash` text NOT NULL,
	`commission_rate` real DEFAULT 0.05 NOT NULL,
	`total_earnings` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `commission_amount` real;--> statement-breakpoint
ALTER TABLE `user` ADD `onboarding_completed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `profile_picture` text;--> statement-breakpoint
ALTER TABLE `user` ADD `interests` text;--> statement-breakpoint
ALTER TABLE `user` ADD `skills` text;--> statement-breakpoint
ALTER TABLE `user` ADD `availability` text;