import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

export const appUsers = sqliteTable("app_users", {
	id: text().primaryKey(),
	workosUserId: text().notNull().unique(),
});

export const stories = sqliteTable("stories", {
	id: text().primaryKey(),
	hnStoryId: integer().notNull().unique(),
	title: text(),
	url: text(),
	text: text(),
	score: integer().notNull().default(0),
	hnPostedAt: text(),
	authorUsername: text(),
	commentCount: integer().notNull().default(0),
	commentIds: text().notNull().default("[]"),
});

export const favorites = sqliteTable(
	"favorites",
	{
		id: text().primaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "cascade" }),
		storyId: text()
			.notNull()
			.references(() => stories.id, { onDelete: "cascade" }),
		createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [unique().on(table.appUserId, table.storyId)],
);

export const hfOrganizations = sqliteTable("hf_organizations", {
	id: text().primaryKey(),
	hfOrganizationId: text().notNull().unique(),
	name: text().notNull(),
	fullname: text(),
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
});

export const hfPapers = sqliteTable("hf_papers", {
	id: text().primaryKey(),
	arxivId: text().notNull().unique(),
	organizationId: text().references(() => hfOrganizations.id),
	title: text().notNull(),
	summary: text().notNull(),
	aiSummary: text(),
	aiSummaryModel: text(),
	paperPublishedAt: text().notNull(),
	upvotes: integer().notNull().default(0),
	discussionId: text().notNull(),
	projectPage: text(),
	githubRepo: text(),
	thumbnailUrl: text(),
	withdrawnAt: text(),
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
});

export const hfAuthors = sqliteTable("hf_authors", {
	id: text().primaryKey(),
	hfAuthorId: text().notNull().unique(),
	name: text().notNull(),
	hidden: integer({ mode: "boolean" }).notNull().default(false),
	status: text(),
	statusLastChangedAt: text(),
	hfUserId: text(),
	hfUsername: text(),
	hfFullname: text(),
	avatarUrl: text(),
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
});

export const hfPaperAuthors = sqliteTable(
	"hf_paper_authors",
	{
		id: text().primaryKey(),
		paperId: text()
			.notNull()
			.references(() => hfPapers.id, { onDelete: "cascade" }),
		authorId: text()
			.notNull()
			.references(() => hfAuthors.id, { onDelete: "cascade" }),
		position: integer().notNull(),
		createdAt: text().notNull(),
		updatedAt: text().notNull(),
	},
	(table) => [
		unique().on(table.paperId, table.authorId),
		unique().on(table.paperId, table.position),
		check("hf_paper_authors_position_check", sql`${table.position} >= 1`),
	],
);

export const hfPaperKeywords = sqliteTable(
	"hf_paper_keywords",
	{
		id: text().primaryKey(),
		paperId: text()
			.notNull()
			.references(() => hfPapers.id, { onDelete: "cascade" }),
		keywordOriginal: text().notNull(),
		keywordNormalized: text().notNull(),
		position: integer().notNull(),
		createdAt: text().notNull(),
		updatedAt: text().notNull(),
	},
	(table) => [
		unique().on(table.paperId, table.keywordNormalized),
		unique().on(table.paperId, table.position),
		index("hf_paper_keywords_keyword_normalized_idx").on(
			table.keywordNormalized,
		),
		index("hf_paper_keywords_paper_id_idx").on(table.paperId),
		check("hf_paper_keywords_position_check", sql`${table.position} >= 1`),
	],
);

export const hfDailyPaperEntries = sqliteTable(
	"hf_daily_paper_entries",
	{
		id: text().primaryKey(),
		editionDate: text().notNull(),
		paperId: text()
			.notNull()
			.references(() => hfPapers.id, { onDelete: "cascade" }),
		entryPublishedAt: text().notNull(),
		isAuthorParticipating: integer({ mode: "boolean" })
			.notNull()
			.default(false),
		rank: integer().notNull(),
		createdAt: text().notNull(),
		updatedAt: text().notNull(),
	},
	(table) => [
		unique().on(table.editionDate, table.paperId),
		unique().on(table.editionDate, table.rank),
		index("hf_daily_paper_entries_edition_date_rank_idx").on(
			table.editionDate,
			table.rank,
		),
		index("hf_daily_paper_entries_paper_id_idx").on(table.paperId),
		check("hf_daily_paper_entries_rank_check", sql`${table.rank} >= 1`),
	],
);

export const hfIngestionRuns = sqliteTable(
	"hf_ingestion_runs",
	{
		id: text().primaryKey(),
		editionDate: text().notNull(),
		status: text({
			enum: ["running", "success", "failed"],
		}).notNull(),
		startedAt: text().notNull(),
		finishedAt: text(),
		sourceUrl: text().notNull(),
		limitValue: integer().notNull(),
		sortValue: text().notNull(),
		fetchedCount: integer(),
		upsertedPaperCount: integer(),
		upsertedAuthorCount: integer(),
		upsertedOrganizationCount: integer(),
		upsertedDailyEntryCount: integer(),
		errorMessage: text(),
		createdAt: text().notNull(),
		updatedAt: text().notNull(),
	},
	(table) => [
		check(
			"hf_ingestion_runs_status_check",
			sql`${table.status} in ('running', 'success', 'failed')`,
		),
	],
);
