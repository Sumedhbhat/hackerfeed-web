CREATE TABLE `ai_provider_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`providerId` text NOT NULL,
	`clientId` text,
	`registrationMetadata` text DEFAULT '{}' NOT NULL,
	`subject` text NOT NULL,
	`email` text,
	`name` text,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`scopes` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_provider_connections_appUserId_providerId_unique` ON `ai_provider_connections` (`appUserId`,`providerId`);--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`manageUrl` text,
	`enabled` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `ai_providers` (`id`, `name`, `description`, `manageUrl`, `enabled`, `sortOrder`) VALUES ('chatgpt', 'ChatGPT', 'Use your ChatGPT plan to discuss stories right here.', 'https://chatgpt.com/settings/usage', 1, 0);
