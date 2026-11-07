import type { hfPaperKeywords } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { paperId } from "./papers";

type PaperKeyword = typeof hfPaperKeywords.$inferSelect;

/** Each snapshot paper's Hugging Face keywords, in their listed order. */
export const paperKeywordRows: PaperKeyword[] = snapshotPapers.flatMap(
	({ paper }) =>
		paper.keywords.map((keyword) => ({
			id: `${paperId(paper.arxivId)}-keyword-${keyword.position}`,
			paperId: paperId(paper.arxivId),
			...keyword,
			...ingestedTimestamps,
		})),
);
