import type { hfDailyPaperEntries } from "#/server/database/schema";
import { DEMO_DATE, ingestedTimestamps, isoAt } from "../defaults";
import { paperRows } from "./papers";

type DailyPaperEntry = typeof hfDailyPaperEntries.$inferSelect;

/** Today's edition lists every paper, ranked in paperRows order. */
export const dailyPaperEntryRows: DailyPaperEntry[] = paperRows.map(
	(paper, index) => ({
		id: `${paper.id}-entry-${DEMO_DATE}`,
		editionDate: DEMO_DATE,
		paperId: paper.id,
		entryPublishedAt: isoAt(`0${index}:00:00`),
		isAuthorParticipating: index % 2 === 0,
		rank: index + 1,
		...ingestedTimestamps,
	}),
);
