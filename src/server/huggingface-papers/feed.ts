import "@tanstack/react-start/server-only";

import type { PaperEdition, PopularPaperKeyword } from "#/lib/papers/schemas";
import type { DatabaseContext } from "#/server/database/client";
import {
	createHuggingFacePaperFeedRepository,
	type HuggingFacePaperFeedRepository,
	type PaperFeedRecord,
} from "./feed-repository";

function getPopularKeywords(papers: PaperFeedRecord[]): PopularPaperKeyword[] {
	const keywords = new Map<string, PopularPaperKeyword>();

	for (const paper of papers) {
		for (const keyword of new Set(paper.keywords)) {
			const existing = keywords.get(keyword);
			if (existing) {
				existing.paperCount += 1;
				existing.totalUpvotes += paper.upvotes;
				continue;
			}

			keywords.set(keyword, {
				keyword,
				paperCount: 1,
				totalUpvotes: paper.upvotes,
			});
		}
	}

	return Array.from(keywords.values()).sort(
		(left, right) =>
			right.paperCount - left.paperCount ||
			right.totalUpvotes - left.totalUpvotes ||
			left.keyword.localeCompare(right.keyword),
	);
}

export function createHuggingFacePaperFeedService(
	repository: HuggingFacePaperFeedRepository,
) {
	return {
		async getEdition(requestedDate?: string): Promise<PaperEdition> {
			const editionDate = await repository.findEditionDate(requestedDate);
			if (!editionDate) {
				return { editionDate: null, papers: [], popularKeywords: [] };
			}

			const papers = await repository.listPapers(editionDate);
			return {
				editionDate,
				papers: papers.map((paper) => ({
					abstract:
						paper.aiSummary !== null && paper.aiSummary !== paper.summary
							? paper.summary
							: null,
					arxivId: paper.arxivId,
					authors: paper.authors,
					entryPublishedAt: paper.entryPublishedAt,
					githubRepo: paper.githubRepo,
					keywords: paper.keywords,
					paperPublishedAt: paper.paperPublishedAt,
					paperUrl: `https://huggingface.co/papers/${paper.arxivId}`,
					projectPage: paper.projectPage,
					rank: paper.rank,
					summary: paper.aiSummary ?? paper.summary,
					title: paper.title,
					upvotes: paper.upvotes,
				})),
				popularKeywords: getPopularKeywords(papers),
			};
		},
	};
}

export function createHuggingFacePaperFeedServiceFromDatabase(
	database: DatabaseContext,
) {
	return createHuggingFacePaperFeedService(
		createHuggingFacePaperFeedRepository(database),
	);
}

export type HuggingFacePaperFeedService = ReturnType<
	typeof createHuggingFacePaperFeedService
>;
