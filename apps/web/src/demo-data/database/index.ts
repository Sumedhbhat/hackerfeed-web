import * as schema from "@hackerfeed/backend/database/schema";
import { getTableName } from "drizzle-orm";
import { activityEventRows } from "./activity-events";
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
import { paperRows } from "./papers";
import { storyRows } from "./stories";

export type FixtureRow = Record<string, unknown>;

/** Every demo row, keyed by SQL table name. */
export const databaseFixtures = new Map<string, FixtureRow[]>(
	(
		[
			[schema.appUsers, appUserRows],
			[schema.stories, storyRows],
			[schema.favorites, favoriteRows],
			[schema.hfOrganizations, organizationRows],
			[schema.hfPapers, paperRows],
			[schema.paperFavorites, paperFavoriteRows],
			[schema.activityEvents, activityEventRows],
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
