CREATE TABLE `hn_ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`observedHour` text NOT NULL,
	`status` text NOT NULL,
	`startedAt` text NOT NULL,
	`finishedAt` text,
	`sourceBaseUrl` text NOT NULL,
	`perFeedLimit` integer NOT NULL,
	`topIdCount` integer,
	`newIdCount` integer,
	`bestIdCount` integer,
	`uniqueSelectedCount` integer,
	`fetchedCount` integer,
	`persistedStoryCount` integer,
	`insertedVersionCount` integer,
	`persistedFeedObservationCount` integer,
	`skippedCount` integer,
	`errorMessage` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT "hn_ingestion_runs_status_check" CHECK("hn_ingestion_runs"."status" in ('running', 'success', 'failed')),
	CONSTRAINT "hn_ingestion_runs_per_feed_limit_check" CHECK("hn_ingestion_runs"."perFeedLimit" >= 1)
);
--> statement-breakpoint
CREATE INDEX `hn_ingestion_runs_observed_hour_idx` ON `hn_ingestion_runs` (`observedHour`);--> statement-breakpoint
CREATE TABLE `hn_story_feed_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`ingestionRunId` text NOT NULL,
	`storyId` text NOT NULL,
	`storyVersionId` text NOT NULL,
	`observedHour` text NOT NULL,
	`topRank` integer,
	`newRank` integer,
	`bestRank` integer,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`ingestionRunId`) REFERENCES `hn_ingestion_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`storyVersionId`) REFERENCES `hn_story_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "hn_story_feed_observations_top_rank_check" CHECK("hn_story_feed_observations"."topRank" is null or "hn_story_feed_observations"."topRank" >= 1),
	CONSTRAINT "hn_story_feed_observations_new_rank_check" CHECK("hn_story_feed_observations"."newRank" is null or "hn_story_feed_observations"."newRank" >= 1),
	CONSTRAINT "hn_story_feed_observations_best_rank_check" CHECK("hn_story_feed_observations"."bestRank" is null or "hn_story_feed_observations"."bestRank" >= 1),
	CONSTRAINT "hn_story_feed_observations_has_rank_check" CHECK("hn_story_feed_observations"."topRank" is not null or "hn_story_feed_observations"."newRank" is not null or "hn_story_feed_observations"."bestRank" is not null)
);
--> statement-breakpoint
CREATE INDEX `hn_story_feed_observations_observed_hour_idx` ON `hn_story_feed_observations` (`observedHour`);--> statement-breakpoint
CREATE INDEX `hn_story_feed_observations_story_id_observed_hour_idx` ON `hn_story_feed_observations` (`storyId`,`observedHour`);--> statement-breakpoint
CREATE INDEX `hn_story_feed_observations_story_version_id_idx` ON `hn_story_feed_observations` (`storyVersionId`);--> statement-breakpoint
CREATE INDEX `hn_story_feed_observations_observed_hour_top_rank_idx` ON `hn_story_feed_observations` (`observedHour`,`topRank`);--> statement-breakpoint
CREATE INDEX `hn_story_feed_observations_observed_hour_new_rank_idx` ON `hn_story_feed_observations` (`observedHour`,`newRank`);--> statement-breakpoint
CREATE INDEX `hn_story_feed_observations_observed_hour_best_rank_idx` ON `hn_story_feed_observations` (`observedHour`,`bestRank`);--> statement-breakpoint
CREATE UNIQUE INDEX `hn_story_feed_observations_observedHour_storyId_unique` ON `hn_story_feed_observations` (`observedHour`,`storyId`);--> statement-breakpoint
CREATE TABLE `hn_story_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`ingestionRunId` text NOT NULL,
	`storyId` text NOT NULL,
	`availabilityStatus` text NOT NULL,
	`title` text,
	`url` text,
	`text` text,
	`score` integer NOT NULL,
	`hnPostedAt` text,
	`authorUsername` text,
	`commentCount` integer NOT NULL,
	`commentIds` text NOT NULL,
	`validFrom` text NOT NULL,
	`validTo` text,
	`recordedAt` text NOT NULL,
	FOREIGN KEY (`ingestionRunId`) REFERENCES `hn_ingestion_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hn_story_versions_status_check" CHECK("hn_story_versions"."availabilityStatus" in ('active', 'dead', 'deleted')),
	CONSTRAINT "hn_story_versions_valid_range_check" CHECK("hn_story_versions"."validTo" is null or "hn_story_versions"."validTo" > "hn_story_versions"."validFrom")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hn_story_versions_one_open_per_story_idx` ON `hn_story_versions` (`storyId`) WHERE "hn_story_versions"."validTo" is null;--> statement-breakpoint
CREATE INDEX `hn_story_versions_story_id_valid_from_idx` ON `hn_story_versions` (`storyId`,`validFrom`);--> statement-breakpoint
CREATE INDEX `hn_story_versions_valid_from_idx` ON `hn_story_versions` (`validFrom`);--> statement-breakpoint
CREATE INDEX `hn_story_versions_valid_to_idx` ON `hn_story_versions` (`validTo`);--> statement-breakpoint
CREATE UNIQUE INDEX `hn_story_versions_storyId_validFrom_unique` ON `hn_story_versions` (`storyId`,`validFrom`);--> statement-breakpoint
ALTER TABLE `stories` ADD `availabilityStatus` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `firstIngestedAt` text;--> statement-breakpoint
ALTER TABLE `stories` ADD `lastIngestedAt` text;