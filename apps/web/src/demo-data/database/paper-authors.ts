import type { hfPaperAuthors } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";
import { authorId } from "./authors";
import { paperId } from "./papers";

type PaperAuthor = typeof hfPaperAuthors.$inferSelect;

/** Each snapshot paper's authors, in their listed order. */
export const paperAuthorRows: PaperAuthor[] = snapshotPapers.flatMap(
	({ paper }) =>
		paper.authors.map((author) => ({
			id: `${paperId(paper.arxivId)}-${authorId(author.hfAuthorId)}`,
			paperId: paperId(paper.arxivId),
			authorId: authorId(author.hfAuthorId),
			position: author.position,
			...ingestedTimestamps,
		})),
);
