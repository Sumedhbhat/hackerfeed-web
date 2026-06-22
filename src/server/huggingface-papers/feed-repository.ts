import "@tanstack/react-start/server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import type { DatabaseContext } from "#/server/database/client";
import {
	hfAuthors,
	hfDailyPaperEntries,
	hfIngestionRuns,
	hfPaperAuthors,
	hfPaperKeywords,
	hfPapers,
} from "#/server/database/schema";

export type PaperFeedRecord = {
	rank: number;
	entryPublishedAt: string;
	arxivId: string;
	title: string;
	summary: string;
	aiSummary: string | null;
	paperPublishedAt: string;
	upvotes: number;
	projectPage: string | null;
	githubRepo: string | null;
	authors: string[];
	keywords: string[];
};

export function createHuggingFacePaperFeedRepository(
	database: DatabaseContext,
) {
	return {
		async findEditionDate(requestedDate?: string): Promise<string | null> {
			const where = requestedDate
				? and(
						eq(hfIngestionRuns.status, "success"),
						eq(hfIngestionRuns.editionDate, requestedDate),
					)
				: eq(hfIngestionRuns.status, "success");
			const [run] = await database
				.select({ editionDate: hfIngestionRuns.editionDate })
				.from(hfIngestionRuns)
				.where(where)
				.orderBy(
					desc(hfIngestionRuns.editionDate),
					desc(hfIngestionRuns.startedAt),
				)
				.limit(1);

			return run?.editionDate ?? null;
		},

		async listPapers(editionDate: string): Promise<PaperFeedRecord[]> {
			const paperRows = await database
				.select({
					paperId: hfPapers.id,
					rank: hfDailyPaperEntries.rank,
					entryPublishedAt: hfDailyPaperEntries.entryPublishedAt,
					arxivId: hfPapers.arxivId,
					title: hfPapers.title,
					summary: hfPapers.summary,
					aiSummary: hfPapers.aiSummary,
					paperPublishedAt: hfPapers.paperPublishedAt,
					upvotes: hfPapers.upvotes,
					projectPage: hfPapers.projectPage,
					githubRepo: hfPapers.githubRepo,
				})
				.from(hfDailyPaperEntries)
				.innerJoin(hfPapers, eq(hfDailyPaperEntries.paperId, hfPapers.id))
				.where(eq(hfDailyPaperEntries.editionDate, editionDate))
				.orderBy(hfDailyPaperEntries.rank);

			if (paperRows.length === 0) return [];

			const paperIds = paperRows.map((paper) => paper.paperId);
			const [authorRows, keywordRows] = await Promise.all([
				database
					.select({
						paperId: hfPaperAuthors.paperId,
						name: hfAuthors.name,
						position: hfPaperAuthors.position,
					})
					.from(hfPaperAuthors)
					.innerJoin(hfAuthors, eq(hfPaperAuthors.authorId, hfAuthors.id))
					.where(
						and(
							inArray(hfPaperAuthors.paperId, paperIds),
							eq(hfAuthors.hidden, false),
						),
					)
					.orderBy(hfPaperAuthors.paperId, hfPaperAuthors.position),
				database
					.select({
						paperId: hfPaperKeywords.paperId,
						keyword: hfPaperKeywords.keywordNormalized,
						position: hfPaperKeywords.position,
					})
					.from(hfPaperKeywords)
					.where(inArray(hfPaperKeywords.paperId, paperIds))
					.orderBy(hfPaperKeywords.paperId, hfPaperKeywords.position),
			]);

			const authorsByPaper = new Map<string, string[]>();
			for (const author of authorRows) {
				const authors = authorsByPaper.get(author.paperId) ?? [];
				authors.push(author.name);
				authorsByPaper.set(author.paperId, authors);
			}

			const keywordsByPaper = new Map<string, string[]>();
			for (const keyword of keywordRows) {
				const keywords = keywordsByPaper.get(keyword.paperId) ?? [];
				keywords.push(keyword.keyword);
				keywordsByPaper.set(keyword.paperId, keywords);
			}

			return paperRows.map(({ paperId, ...paper }) => ({
				...paper,
				authors: authorsByPaper.get(paperId) ?? [],
				keywords: keywordsByPaper.get(paperId) ?? [],
			}));
		},
	};
}

export type HuggingFacePaperFeedRepository = ReturnType<
	typeof createHuggingFacePaperFeedRepository
>;
