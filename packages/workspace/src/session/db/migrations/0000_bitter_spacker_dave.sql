CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`description` text,
	`workspaceId` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`requestId` text NOT NULL,
	`responseId` text NOT NULL,
	`index` integer NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requestId`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responseId`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `turns` (
	`id` text PRIMARY KEY NOT NULL,
	`responseId` text NOT NULL,
	`index` integer NOT NULL,
	`rawResponse` text NOT NULL,
	`content` text NOT NULL,
	`toolCalls` text NOT NULL,
	`status` text DEFAULT 'streaming' NOT NULL,
	`streamStartTime` integer NOT NULL,
	`streamEndTime` integer,
	`currentTokens` integer DEFAULT 0 NOT NULL,
	`expectedTokens` integer,
	`inputTokens` integer NOT NULL,
	`outputTokens` integer NOT NULL,
	`cacheReadTokens` integer,
	`cacheWriteTokens` integer,
	`inputCost` real NOT NULL,
	`outputCost` real NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`responseId`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_workspaceId` ON `sessions` (`workspaceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_requestId_unique` ON `rounds` (`requestId`);--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_responseId_unique` ON `rounds` (`responseId`);--> statement-breakpoint
CREATE INDEX `idx_rounds_sessionId` ON `rounds` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_rounds_sessionIndex` ON `rounds` (`sessionId`,`index`);--> statement-breakpoint
CREATE INDEX `idx_turns_responseId` ON `turns` (`responseId`);--> statement-breakpoint
CREATE INDEX `idx_turns_responseIndex` ON `turns` (`responseId`,`index`);--> statement-breakpoint
CREATE INDEX `idx_activeStreams` ON `turns` (`responseId`) WHERE status = 'streaming';