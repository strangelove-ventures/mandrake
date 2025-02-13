CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`description` text,
	`workspace_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`request_id` text NOT NULL,
	`response_id` text NOT NULL,
	`index` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `turns` (
	`id` text PRIMARY KEY NOT NULL,
	`response_id` text NOT NULL,
	`index` integer NOT NULL,
	`raw_response` text NOT NULL,
	`content` text NOT NULL,
	`tool_calls` text NOT NULL,
	`status` text DEFAULT 'streaming' NOT NULL,
	`stream_start_time` integer NOT NULL,
	`stream_end_time` integer,
	`current_tokens` integer DEFAULT 0 NOT NULL,
	`expected_tokens` integer,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cache_read_tokens` integer,
	`cache_write_tokens` integer,
	`input_cost` real NOT NULL,
	`output_cost` real NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_workspace_id` ON `sessions` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_request_id_unique` ON `rounds` (`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_response_id_unique` ON `rounds` (`response_id`);--> statement-breakpoint
CREATE INDEX `idx_rounds_session_id` ON `rounds` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_rounds_session_index` ON `rounds` (`session_id`,`index`);--> statement-breakpoint
CREATE INDEX `idx_turns_response_id` ON `turns` (`response_id`);--> statement-breakpoint
CREATE INDEX `idx_turns_response_index` ON `turns` (`response_id`,`index`);--> statement-breakpoint
CREATE INDEX `idx_active_streams` ON `turns` (`response_id`) WHERE status = 'streaming';