CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_submission_id` integer,
	`raised_by_id` text,
	`reason` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text,
	`resolved_by_id` text,
	`created_at` text NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`task_submission_id`) REFERENCES `task_submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`raised_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`task_submission_id` integer,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`payment_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text,
	`payment_address` text,
	`transaction_hash` text,
	`notes` text,
	`created_at` text NOT NULL,
	`processed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_submission_id`) REFERENCES `task_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer,
	`reviewer_id` text,
	`reviewee_id` text,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `task_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer,
	`worker_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submission_data` text,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	`reviewer_notes` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`employer_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`price` real NOT NULL,
	`time_estimate` integer,
	`slots` integer DEFAULT 1 NOT NULL,
	`slots_filled` integer DEFAULT 0 NOT NULL,
	`requirements` text,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tasks_completed` integer DEFAULT 0 NOT NULL,
	`tasks_posted` integer DEFAULT 0 NOT NULL,
	`total_earned` real DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`average_rating` real DEFAULT 0 NOT NULL,
	`success_rate` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_stats_user_id_unique` ON `user_stats` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'worker' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `user` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone` text;