import type {
	hfAuthors,
	hfPaperAuthors,
	hfPapers,
} from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import { ada, ben, chen, dana, eli, fay } from "./authors";
import {
	diffusionFixtures,
	loremRag,
	placeholderScaling,
	reasoningBenchmark,
	smallModels,
	sparseAttention,
} from "./papers";

type PaperAuthor = typeof hfPaperAuthors.$inferSelect;

/** One row per author, positioned in the order given. */
export const paperAuthors = (
	paper: typeof hfPapers.$inferSelect,
	authors: (typeof hfAuthors.$inferSelect)[],
): PaperAuthor[] =>
	authors.map((author, index) => ({
		id: `${paper.id}-${author.id}`,
		paperId: paper.id,
		authorId: author.id,
		position: index + 1,
		...ingestedTimestamps,
	}));

export const paperAuthorRows: PaperAuthor[] = [
	...paperAuthors(sparseAttention, [ada, ben]),
	...paperAuthors(reasoningBenchmark, [ben]),
	...paperAuthors(smallModels, [chen, dana]),
	...paperAuthors(diffusionFixtures, [dana]),
	...paperAuthors(loremRag, [eli, fay]),
	...paperAuthors(placeholderScaling, [fay]),
];
