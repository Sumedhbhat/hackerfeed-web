import type { hfPaperKeywords } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { paperId } from "./papers";

type PaperKeyword = typeof hfPaperKeywords.$inferSelect;

export const paperKeywordRows: PaperKeyword[] = snapshotPapers.flatMap(
	(paper) =>
		paper.keywords.map((keyword, index) => ({
			id: `${paperId(paper.arxivId)}-keyword-${index + 1}`,
			paperId: paperId(paper.arxivId),
			keywordOriginal: keyword,
			// The same normalization production ingestion applies.
			keywordNormalized: keyword.trim().toLowerCase().replace(/\s+/g, " "),
			position: index + 1,
			...ingestedTimestamps,
		})),
);
