import { getTableName } from "drizzle-orm";
import * as schema from "#/server/database/schema";
import { aiProviderConnectionRows, aiProviderRows } from "./ai-providers";
import { appUserRows } from "./app-users";
import { authorRows } from "./authors";
import { dailyPaperEntryRows } from "./daily-paper-entries";
import { favoriteRows } from "./favorites";
import { ingestionRunRows } from "./ingestion-runs";
import { organizationRows } from "./organizations";
import { paperAuthorRows } from "./paper-authors";
import { paperFavoriteRows } from "./paper-favorites";
import { paperKeywordRows } from "./paper-keywords";
import { paperViewRows } from "./paper-views";
import { paperRows } from "./papers";
import { storyRows } from "./stories";
import { storyViewRows } from "./story-views";

export type FixtureRow = Record<string, unknown>;

/** Every demo row, keyed by SQL table name. */
export const databaseFixtures = new Map<string, FixtureRow[]>(
	(
		[
			[schema.appUsers, appUserRows],
			[schema.stories, storyRows],
			[schema.favorites, favoriteRows],
			[schema.storyViews, storyViewRows],
			[schema.hfOrganizations, organizationRows],
			[schema.hfPapers, paperRows],
			[schema.paperFavorites, paperFavoriteRows],
			[schema.paperViews, paperViewRows],
			[schema.hfAuthors, authorRows],
			[schema.hfPaperAuthors, paperAuthorRows],
			[schema.hfPaperKeywords, paperKeywordRows],
			[schema.hfDailyPaperEntries, dailyPaperEntryRows],
			[schema.hfIngestionRuns, ingestionRunRows],
			[schema.aiProviders, aiProviderRows],
			[schema.aiProviderConnections, aiProviderConnectionRows],
		] as const
	).map(([table, rows]) => [getTableName(table), rows]),
);
