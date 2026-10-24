import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

const uuidPrimaryKey = () =>
	text()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

export const appUsers = sqliteTable("app_users", {
	id: uuidPrimaryKey(),
	workosUserId: text().notNull().unique(),
});

export const stories = sqliteTable("stories", {
	id: uuidPrimaryKey(),
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
		id: uuidPrimaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "cascade" }),
		storyId: text()
			.notNull()
			.references(() => stories.id, { onDelete: "cascade" }),
		createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		unique().on(table.appUserId, table.storyId),
		index("favorites_app_user_id_created_at_id_idx").on(
			table.appUserId,
			table.createdAt,
			table.id,
		),
	],
);

export const hfOrganizations = sqliteTable("hf_organizations", {
	id: uuidPrimaryKey(),
	hfOrganizationId: text().notNull().unique(),
	name: text().notNull(),
	fullname: text(),
	createdAt: text().notNull(),
	updatedAt: text().notNull(),
});

export const hfPapers = sqliteTable("hf_papers", {
	id: uuidPrimaryKey(),
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

export const paperFavorites = sqliteTable(
	"paper_favorites",
	{
		id: uuidPrimaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "cascade" }),
		paperId: text()
			.notNull()
			.references(() => hfPapers.id, { onDelete: "cascade" }),
		createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [
		unique().on(table.appUserId, table.paperId),
		index("paper_favorites_app_user_id_created_at_id_idx").on(
			table.appUserId,
			table.createdAt,
			table.id,
		),
		index("paper_favorites_paper_id_idx").on(table.paperId),
	],
);

export const activityActions = [
	"story.read",
	"story.discussion_opened",
	"story.chat_opened",
	"story.favorited",
	"story.unfavorited",
	"paper.read",
	"paper.chat_opened",
	"paper.favorited",
	"paper.unfavorited",
] as const;

export type ActivityAction = (typeof activityActions)[number];

/** Append-only log of what signed-in users do, for analytics. */
export const activityEvents = sqliteTable(
	"activity_events",
	{
		id: integer().primaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "restrict" }),
		action: text({ enum: activityActions }).notNull(),
		storyId: text().references(() => stories.id, { onDelete: "restrict" }),
		paperId: text().references(() => hfPapers.id, { onDelete: "restrict" }),
		occurredAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		lastUpdatedDate: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		lastUpdatedBy: text().notNull(),
	},
	(table) => [
		index("activity_events_app_user_id_occurred_at_idx").on(
			table.appUserId,
			table.occurredAt,
		),
		index("activity_events_action_occurred_at_idx").on(
			table.action,
			table.occurredAt,
		),
		index("activity_events_story_id_idx").on(table.storyId),
		index("activity_events_paper_id_idx").on(table.paperId),
		check(
			"activity_events_subject_check",
			sql`(${table.storyId} is not null and ${table.paperId} is null and ${table.action} like 'story.%') or (${table.paperId} is not null and ${table.storyId} is null and ${table.action} like 'paper.%')`,
		),
	],
);

export const hfAuthors = sqliteTable("hf_authors", {
	id: uuidPrimaryKey(),
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
		id: uuidPrimaryKey(),
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
		id: uuidPrimaryKey(),
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
		id: uuidPrimaryKey(),
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
		id: uuidPrimaryKey(),
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

/**
 * Catalog of AI apps users can connect with their own subscription (e.g.
 * ChatGPT). Each enabled row needs a matching adapter in
 * `src/server/ai/providers`; rows without one are hidden.
 */
export const aiProviders = sqliteTable("ai_providers", {
	/** Stable slug used in URLs and to pick the adapter, e.g. "chatgpt". */
	id: text().primaryKey(),
	name: text().notNull(),
	description: text().notNull(),
	/** Where users manage usage or revoke access at the provider. */
	manageUrl: text(),
	enabled: integer({ mode: "boolean" }).notNull().default(true),
	sortOrder: integer().notNull().default(0),
	createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const aiProviderConnections = sqliteTable(
	"ai_provider_connections",
	{
		id: uuidPrimaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "cascade" }),
		providerId: text()
			.notNull()
			.references(() => aiProviders.id, { onDelete: "cascade" }),
		/** OAuth client registered for this user; kept after disconnect for reuse. */
		clientId: text(),
		/** Provider-specific registration details (JSON object). */
		registrationMetadata: text().notNull().default("{}"),
		/** The user's account id at the provider. */
		subject: text().notNull(),
		email: text(),
		name: text(),
		/** AES-GCM sealed; null once disconnected. */
		accessToken: text(),
		refreshToken: text(),
		accessTokenExpiresAt: integer(),
		scopes: text().notNull().default(""),
		createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [unique().on(table.appUserId, table.providerId)],
);
