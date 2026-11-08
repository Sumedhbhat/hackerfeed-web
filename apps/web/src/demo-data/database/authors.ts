import type { hfAuthors } from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { snapshotPapers } from "../snapshot";

type Author = typeof hfAuthors.$inferSelect;

/** Authors are keyed by name in the demo; the snapshot keeps only names. */
export const authorId = (name: string) =>
	`demo-author-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** Every author of a snapshot paper, once each. */
export const authorRows: Author[] = [
	...new Set(snapshotPapers.flatMap((paper) => paper.authors)),
].map((name) => ({
	id: authorId(name),
	hfAuthorId: authorId(name),
	name,
	hidden: false,
	status: null,
	statusLastChangedAt: null,
	hfUserId: null,
	hfUsername: null,
	hfFullname: null,
	avatarUrl: null,
	...ingestedTimestamps,
}));
