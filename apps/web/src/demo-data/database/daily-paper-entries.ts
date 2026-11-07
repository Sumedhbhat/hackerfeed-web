import type { hfDailyPaperEntries } from "@hackerfeed/backend/database/schema";
import { DEMO_DATE, ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { paperId } from "./papers";

type DailyPaperEntry = typeof hfDailyPaperEntries.$inferSelect;

/** The snapshot's edition: every paper, in its rank order. */
export const dailyPaperEntryRows: DailyPaperEntry[] = snapshotPapers.map(
	(entry) => ({
		id: `${paperId(entry.paper.arxivId)}-entry-${DEMO_DATE}`,
		editionDate: DEMO_DATE,
		paperId: paperId(entry.paper.arxivId),
		entryPublishedAt: entry.entryPublishedAt,
		isAuthorParticipating: entry.isAuthorParticipating,
		rank: entry.rank,
		...ingestedTimestamps,
	}),
);
