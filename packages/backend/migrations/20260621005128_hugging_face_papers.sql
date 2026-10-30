CREATE TABLE `hf_authors` (
	`id` text PRIMARY KEY NOT NULL,
	`hfAuthorId` text NOT NULL,
	`name` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`status` text,
	`statusLastChangedAt` text,
	`hfUserId` text,
	`hfUsername` text,
	`hfFullname` text,
	`avatarUrl` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hf_authors_hfAuthorId_unique` ON `hf_authors` (`hfAuthorId`);--> statement-breakpoint
CREATE TABLE `hf_daily_paper_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`editionDate` text NOT NULL,
	`paperId` text NOT NULL,
	`entryPublishedAt` text NOT NULL,
	`isAuthorParticipating` integer DEFAULT false NOT NULL,
	`rank` integer NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`paperId`) REFERENCES `hf_papers`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hf_daily_paper_entries_rank_check" CHECK("hf_daily_paper_entries"."rank" >= 1)
);
--> statement-breakpoint
CREATE INDEX `hf_daily_paper_entries_edition_date_rank_idx` ON `hf_daily_paper_entries` (`editionDate`,`rank`);--> statement-breakpoint
CREATE INDEX `hf_daily_paper_entries_paper_id_idx` ON `hf_daily_paper_entries` (`paperId`);--> statement-breakpoint
CREATE UNIQUE INDEX `hf_daily_paper_entries_editionDate_paperId_unique` ON `hf_daily_paper_entries` (`editionDate`,`paperId`);--> statement-breakpoint
CREATE UNIQUE INDEX `hf_daily_paper_entries_editionDate_rank_unique` ON `hf_daily_paper_entries` (`editionDate`,`rank`);--> statement-breakpoint
CREATE TABLE `hf_ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`editionDate` text NOT NULL,
	`status` text NOT NULL,
	`startedAt` text NOT NULL,
	`finishedAt` text,
	`sourceUrl` text NOT NULL,
	`limitValue` integer NOT NULL,
	`sortValue` text NOT NULL,
	`fetchedCount` integer,
	`upsertedPaperCount` integer,
	`upsertedAuthorCount` integer,
	`upsertedOrganizationCount` integer,
	`upsertedDailyEntryCount` integer,
	`errorMessage` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT "hf_ingestion_runs_status_check" CHECK("hf_ingestion_runs"."status" in ('running', 'success', 'failed'))
);
--> statement-breakpoint
CREATE TABLE `hf_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`hfOrganizationId` text NOT NULL,
	`name` text NOT NULL,
	`fullname` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hf_organizations_hfOrganizationId_unique` ON `hf_organizations` (`hfOrganizationId`);--> statement-breakpoint
CREATE TABLE `hf_paper_authors` (
	`id` text PRIMARY KEY NOT NULL,
	`paperId` text NOT NULL,
	`authorId` text NOT NULL,
	`position` integer NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`paperId`) REFERENCES `hf_papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`authorId`) REFERENCES `hf_authors`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hf_paper_authors_position_check" CHECK("hf_paper_authors"."position" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hf_paper_authors_paperId_authorId_unique` ON `hf_paper_authors` (`paperId`,`authorId`);--> statement-breakpoint
CREATE UNIQUE INDEX `hf_paper_authors_paperId_position_unique` ON `hf_paper_authors` (`paperId`,`position`);--> statement-breakpoint
CREATE TABLE `hf_paper_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`paperId` text NOT NULL,
	`keywordOriginal` text NOT NULL,
	`keywordNormalized` text NOT NULL,
	`position` integer NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`paperId`) REFERENCES `hf_papers`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hf_paper_keywords_position_check" CHECK("hf_paper_keywords"."position" >= 1)
);
--> statement-breakpoint
CREATE INDEX `hf_paper_keywords_keyword_normalized_idx` ON `hf_paper_keywords` (`keywordNormalized`);--> statement-breakpoint
CREATE INDEX `hf_paper_keywords_paper_id_idx` ON `hf_paper_keywords` (`paperId`);--> statement-breakpoint
CREATE UNIQUE INDEX `hf_paper_keywords_paperId_keywordNormalized_unique` ON `hf_paper_keywords` (`paperId`,`keywordNormalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `hf_paper_keywords_paperId_position_unique` ON `hf_paper_keywords` (`paperId`,`position`);--> statement-breakpoint
CREATE TABLE `hf_papers` (
	`id` text PRIMARY KEY NOT NULL,
	`arxivId` text NOT NULL,
	`organizationId` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`aiSummary` text,
	`aiSummaryModel` text,
	`paperPublishedAt` text NOT NULL,
	`upvotes` integer DEFAULT 0 NOT NULL,
	`discussionId` text NOT NULL,
	`projectPage` text,
	`githubRepo` text,
	`thumbnailUrl` text,
	`withdrawnAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `hf_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hf_papers_arxivId_unique` ON `hf_papers` (`arxivId`);
