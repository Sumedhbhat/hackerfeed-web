CREATE TABLE `activity_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`action` text NOT NULL,
	`storyId` text,
	`paperId` text,
	`occurredAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastUpdatedDate` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastUpdatedBy` text NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`paperId`) REFERENCES `hf_papers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "activity_events_subject_check" CHECK(("activity_events"."storyId" is not null and "activity_events"."paperId" is null and "activity_events"."action" like 'story.%') or ("activity_events"."paperId" is not null and "activity_events"."storyId" is null and "activity_events"."action" like 'paper.%'))
);
--> statement-breakpoint
CREATE INDEX `activity_events_app_user_id_occurred_at_idx` ON `activity_events` (`appUserId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `activity_events_action_occurred_at_idx` ON `activity_events` (`action`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `activity_events_story_id_idx` ON `activity_events` (`storyId`);--> statement-breakpoint
CREATE INDEX `activity_events_paper_id_idx` ON `activity_events` (`paperId`);