import type { hfPaperAuthors } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { authorId } from "./authors";
import { paperId } from "./papers";

type PaperAuthor = typeof hfPaperAuthors.$inferSelect;

export const paperAuthorRows: PaperAuthor[] = snapshotPapers.flatMap((paper) =>
	paper.authors.map((name, index) => ({
		id: `${paperId(paper.arxivId)}-${authorId(name)}`,
		paperId: paperId(paper.arxivId),
		authorId: authorId(name),
		position: index + 1,
		...ingestedTimestamps,
	})),
);
