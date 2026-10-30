CREATE TABLE `paper_views` (
	`id` text PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`paperId` text NOT NULL,
	`viewedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastUpdatedDate` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastUpdatedBy` text NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`paperId`) REFERENCES `hf_papers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `paper_views_app_user_id_viewed_at_id_idx` ON `paper_views` (`appUserId`,`viewedAt`,`id`);--> statement-breakpoint
CREATE INDEX `paper_views_paper_id_viewed_at_id_idx` ON `paper_views` (`paperId`,`viewedAt`,`id`);--> statement-breakpoint
CREATE TABLE `story_views` (
	`id` text PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`storyId` text NOT NULL,
	`viewedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastUpdatedDate` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastUpdatedBy` text NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `story_views_app_user_id_viewed_at_id_idx` ON `story_views` (`appUserId`,`viewedAt`,`id`);--> statement-breakpoint
CREATE INDEX `story_views_story_id_viewed_at_id_idx` ON `story_views` (`storyId`,`viewedAt`,`id`);