CREATE TABLE `paper_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`paperId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paperId`) REFERENCES `hf_papers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `paper_favorites_app_user_id_created_at_id_idx` ON `paper_favorites` (`appUserId`,`createdAt`,`id`);--> statement-breakpoint
CREATE INDEX `paper_favorites_paper_id_idx` ON `paper_favorites` (`paperId`);--> statement-breakpoint
CREATE UNIQUE INDEX `paper_favorites_appUserId_paperId_unique` ON `paper_favorites` (`appUserId`,`paperId`);--> statement-breakpoint
CREATE INDEX `favorites_app_user_id_created_at_id_idx` ON `favorites` (`appUserId`,`createdAt`,`id`);