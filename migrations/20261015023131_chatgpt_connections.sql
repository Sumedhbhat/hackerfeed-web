CREATE TABLE `chatgpt_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`clientId` text NOT NULL,
	`hostId` text NOT NULL,
	`subject` text NOT NULL,
	`email` text,
	`name` text,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`scopes` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chatgpt_connections_appUserId_unique` ON `chatgpt_connections` (`appUserId`);