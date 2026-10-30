import type { hfIngestionRuns } from "@hackerfeed/backend/database/schema";
import { DEMO_DATE, INGESTED_AT, ingestedTimestamps, isoAt } from "../defaults";
import { authorRows } from "./authors";
import { dailyPaperEntryRows } from "./daily-paper-entries";
import { organizationRows } from "./organizations";
import { paperRows } from "./papers";

type IngestionRun = typeof hfIngestionRuns.$inferSelect;

export const ingestionRunRows: IngestionRun[] = [
	{
		id: `demo-ingestion-run-${DEMO_DATE}`,
		editionDate: DEMO_DATE,
		status: "success",
		startedAt: INGESTED_AT,
		finishedAt: isoAt("00:30:05"),
		sourceUrl: `https://huggingface.co/api/daily_papers?date=${DEMO_DATE}&limit=100&sort=publishedAt`,
		limitValue: 100,
		sortValue: "publishedAt",
		fetchedCount: dailyPaperEntryRows.length,
		upsertedPaperCount: paperRows.length,
		upsertedAuthorCount: authorRows.length,
		upsertedOrganizationCount: organizationRows.length,
		upsertedDailyEntryCount: dailyPaperEntryRows.length,
		errorMessage: null,
		...ingestedTimestamps,
	},
];
