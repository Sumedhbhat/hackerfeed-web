import type { hfPapers } from "#/server/database/schema";
import { ingestedTimestamps } from "../defaults";
import { exampleUniversity, placeholderAi } from "./organizations";

type Paper = typeof hfPapers.$inferSelect;

export const paper = (
	fields: Pick<Paper, "arxivId" | "title" | "summary" | "paperPublishedAt"> &
		Partial<Paper>,
): Paper => ({
	id: `demo-paper-${fields.arxivId}`,
	organizationId: null,
	aiSummary: null,
	aiSummaryModel: null,
	upvotes: 0,
	discussionId: `demo-discussion-${fields.arxivId}`,
	projectPage: null,
	githubRepo: null,
	thumbnailUrl: null,
	withdrawnAt: null,
	...ingestedTimestamps,
	...fields,
});

const aiSummary = (text: string) => ({
	aiSummary: text,
	aiSummaryModel: "demo-model",
});

const PROJECT_PAGE = "https://example.com/papers/project";
const GITHUB_REPO = "https://github.com/example/placeholder";

export const sparseAttention = paper({
	arxivId: "2601.00001",
	organizationId: placeholderAi.id,
	title: "Sparse Attention for Very Long Placeholder Documents",
	summary:
		"We study sparse attention patterns on synthetic long documents and show a 4x memory reduction with no loss in placeholder accuracy.",
	...aiSummary("Sparse attention cuts memory 4x on long documents."),
	paperPublishedAt: "2026-01-10T09:00:00.000Z",
	upvotes: 120,
	projectPage: PROJECT_PAGE,
	githubRepo: GITHUB_REPO,
});

export const reasoningBenchmark = paper({
	arxivId: "2601.00002",
	organizationId: exampleUniversity.id,
	title: "A Benchmark of Imaginary Reasoning Tasks",
	summary:
		"We introduce a benchmark of 1,000 made-up reasoning tasks and evaluate a dozen fictional models on it.",
	paperPublishedAt: "2026-01-11T09:00:00.000Z",
	upvotes: 105,
});

export const smallModels = paper({
	arxivId: "2601.00003",
	title: "Training Small Models on Dummy Data",
	summary:
		"This paper shows that small models trained only on dummy data learn surprisingly little, as expected.",
	...aiSummary("Small models learn little from dummy data."),
	paperPublishedAt: "2026-01-12T09:00:00.000Z",
	upvotes: 90,
	projectPage: PROJECT_PAGE,
});

export const diffusionFixtures = paper({
	arxivId: "2601.00004",
	organizationId: placeholderAi.id,
	title: "Diffusion Models for Generating Test Fixtures",
	summary:
		"We apply diffusion models to generate realistic-looking but entirely fake test fixtures for web applications.",
	...aiSummary("Diffusion models can generate fake test fixtures."),
	paperPublishedAt: "2026-01-13T09:00:00.000Z",
	upvotes: 75,
	githubRepo: GITHUB_REPO,
});

export const loremRag = paper({
	arxivId: "2601.00005",
	organizationId: exampleUniversity.id,
	title: "Retrieval-Augmented Generation over Lorem Ipsum",
	summary:
		"We evaluate retrieval-augmented generation on a corpus made entirely of lorem ipsum text.",
	paperPublishedAt: "2026-01-14T09:00:00.000Z",
	upvotes: 60,
	projectPage: PROJECT_PAGE,
});

export const placeholderScaling = paper({
	arxivId: "2601.00006",
	title: "Scaling Laws for Placeholder Text",
	summary:
		"We fit scaling laws to models trained on increasing amounts of placeholder text and find a familiar power law.",
	...aiSummary("Placeholder text follows familiar scaling laws."),
	paperPublishedAt: "2026-01-10T09:00:00.000Z",
	upvotes: 45,
});

export const paperRows: Paper[] = [
	sparseAttention,
	reasoningBenchmark,
	smallModels,
	diffusionFixtures,
	loremRag,
	placeholderScaling,
];
