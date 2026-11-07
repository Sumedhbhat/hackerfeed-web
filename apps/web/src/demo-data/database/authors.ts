import type { hfAuthors } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";

type Author = typeof hfAuthors.$inferSelect;

export const authorId = (hfAuthorId: string) => `demo-author-${hfAuthorId}`;

/** Every author of a snapshot paper, once each. */
export const authorRows: Author[] = [
	...new Map(
		snapshotPapers
			.flatMap(({ paper }) => paper.authors)
			.map(({ position: _position, ...author }): [string, Author] => [
				author.hfAuthorId,
				{ id: authorId(author.hfAuthorId), ...author, ...ingestedTimestamps },
			]),
	).values(),
];
