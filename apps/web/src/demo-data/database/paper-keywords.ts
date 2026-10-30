import type {
	hfPaperKeywords,
	hfPapers,
} from "@hackerfeed/backend/database/schema";
import { ingestedTimestamps } from "../defaults";
import {
	diffusionFixtures,
	loremRag,
	placeholderScaling,
	reasoningBenchmark,
	smallModels,
	sparseAttention,
} from "./papers";

type PaperKeyword = typeof hfPaperKeywords.$inferSelect;

/** One row per keyword, positioned in the order given. */
export const paperKeywords = (
	paper: typeof hfPapers.$inferSelect,
	keywords: string[],
): PaperKeyword[] =>
	keywords.map((keyword, index) => ({
		id: `${paper.id}-keyword-${index + 1}`,
		paperId: paper.id,
		keywordOriginal: keyword,
		keywordNormalized: keyword.toLowerCase(),
		position: index + 1,
		...ingestedTimestamps,
	}));

export const paperKeywordRows: PaperKeyword[] = [
	...paperKeywords(sparseAttention, ["Sparse Attention", "long context"]),
	...paperKeywords(reasoningBenchmark, ["Benchmark", "reasoning"]),
	...paperKeywords(smallModels, ["Small Models", "training data"]),
	...paperKeywords(diffusionFixtures, ["Diffusion", "test data"]),
	...paperKeywords(loremRag, ["Retrieval", "rag"]),
	...paperKeywords(placeholderScaling, ["Scaling Laws"]),
];
