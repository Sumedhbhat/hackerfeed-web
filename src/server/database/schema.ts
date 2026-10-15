import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	sqliteTable,
	text,
	unique,
	uniqueIndex,
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
	availabilityStatus: text({ enum: ["active", "dead", "deleted"] })
		.notNull()
		.default("active"),
	firstIngestedAt: text(),
	lastIngestedAt: text(),
});

export const hnIngestionRuns = sqliteTable(
	"hn_ingestion_runs",
	{
		id: uuidPrimaryKey(),
		observedHour: text().notNull(),
		status: text({ enum: ["running", "success", "failed"] }).notNull(),
		startedAt: text().notNull(),
		finishedAt: text(),
		sourceBaseUrl: text().notNull(),
		perFeedLimit: integer().notNull(),
		topIdCount: integer(),
		newIdCount: integer(),
		bestIdCount: integer(),
		uniqueSelectedCount: integer(),
		fetchedCount: integer(),
		persistedStoryCount: integer(),
		insertedVersionCount: integer(),
		persistedFeedObservationCount: integer(),
		skippedCount: integer(),
		errorMessage: text(),
		createdAt: text().notNull(),
		updatedAt: text().notNull(),
	},
	(table) => [
		index("hn_ingestion_runs_observed_hour_idx").on(table.observedHour),
		check(
			"hn_ingestion_runs_status_check",
			sql`${table.status} in ('running', 'success', 'failed')`,
		),
		check(
			"hn_ingestion_runs_per_feed_limit_check",
			sql`${table.perFeedLimit} >= 1`,
		),
	],
);

export const hnStoryVersions = sqliteTable(
	"hn_story_versions",
	{
		id: uuidPrimaryKey(),
		ingestionRunId: text()
			.notNull()
			.references(() => hnIngestionRuns.id),
		storyId: text()
			.notNull()
			.references(() => stories.id, { onDelete: "cascade" }),
		availabilityStatus: text({ enum: ["active", "dead", "deleted"] }).notNull(),
		title: text(),
		url: text(),
		text: text(),
		score: integer().notNull(),
		hnPostedAt: text(),
		authorUsername: text(),
		commentCount: integer().notNull(),
		commentIds: text().notNull(),
		validFrom: text().notNull(),
		validTo: text(),
		recordedAt: text().notNull(),
	},
	(table) => [
		unique().on(table.storyId, table.validFrom),
		uniqueIndex("hn_story_versions_one_open_per_story_idx")
			.on(table.storyId)
			.where(sql`${table.validTo} is null`),
		index("hn_story_versions_story_id_valid_from_idx").on(
			table.storyId,
			table.validFrom,
		),
		index("hn_story_versions_valid_from_idx").on(table.validFrom),
		index("hn_story_versions_valid_to_idx").on(table.validTo),
		check(
			"hn_story_versions_status_check",
			sql`${table.availabilityStatus} in ('active', 'dead', 'deleted')`,
		),
		check(
			"hn_story_versions_valid_range_check",
			sql`${table.validTo} is null or ${table.validTo} > ${table.validFrom}`,
		),
	],
);

export const hnStoryFeedObservations = sqliteTable(
	"hn_story_feed_observations",
	{
		id: uuidPrimaryKey(),
		ingestionRunId: text()
			.notNull()
			.references(() => hnIngestionRuns.id),
		storyId: text()
			.notNull()
			.references(() => stories.id, { onDelete: "cascade" }),
		storyVersionId: text()
			.notNull()
			.references(() => hnStoryVersions.id, { onDelete: "restrict" }),
		observedHour: text().notNull(),
		topRank: integer(),
		newRank: integer(),
		bestRank: integer(),
		createdAt: text().notNull(),
		updatedAt: text().notNull(),
	},
	(table) => [
		unique().on(table.observedHour, table.storyId),
		index("hn_story_feed_observations_observed_hour_idx").on(
			table.observedHour,
		),
		index("hn_story_feed_observations_story_id_observed_hour_idx").on(
			table.storyId,
			table.observedHour,
		),
		index("hn_story_feed_observations_story_version_id_idx").on(
			table.storyVersionId,
		),
		index("hn_story_feed_observations_observed_hour_top_rank_idx").on(
			table.observedHour,
			table.topRank,
		),
		index("hn_story_feed_observations_observed_hour_new_rank_idx").on(
			table.observedHour,
			table.newRank,
		),
		index("hn_story_feed_observations_observed_hour_best_rank_idx").on(
			table.observedHour,
			table.bestRank,
		),
		check(
			"hn_story_feed_observations_top_rank_check",
			sql`${table.topRank} is null or ${table.topRank} >= 1`,
		),
		check(
			"hn_story_feed_observations_new_rank_check",
			sql`${table.newRank} is null or ${table.newRank} >= 1`,
		),
		check(
			"hn_story_feed_observations_best_rank_check",
			sql`${table.bestRank} is null or ${table.bestRank} >= 1`,
		),
		check(
			"hn_story_feed_observations_has_rank_check",
			sql`${table.topRank} is not null or ${table.newRank} is not null or ${table.bestRank} is not null`,
		),
	],
);

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

export const storyViews = sqliteTable(
	"story_views",
	{
		id: uuidPrimaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "restrict" }),
		storyId: text()
			.notNull()
			.references(() => stories.id, { onDelete: "restrict" }),
		viewedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		lastUpdatedDate: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		lastUpdatedBy: text().notNull(),
	},
	(table) => [
		index("story_views_app_user_id_viewed_at_id_idx").on(
			table.appUserId,
			table.viewedAt,
			table.id,
		),
		index("story_views_story_id_viewed_at_id_idx").on(
			table.storyId,
			table.viewedAt,
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

export const paperViews = sqliteTable(
	"paper_views",
	{
		id: uuidPrimaryKey(),
		appUserId: text()
			.notNull()
			.references(() => appUsers.id, { onDelete: "restrict" }),
		paperId: text()
			.notNull()
			.references(() => hfPapers.id, { onDelete: "restrict" }),
		viewedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		lastUpdatedDate: text().notNull().default(sql`CURRENT_TIMESTAMP`),
		lastUpdatedBy: text().notNull(),
	},
	(table) => [
		index("paper_views_app_user_id_viewed_at_id_idx").on(
			table.appUserId,
			table.viewedAt,
			table.id,
		),
		index("paper_views_paper_id_viewed_at_id_idx").on(
			table.paperId,
			table.viewedAt,
			table.id,
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
