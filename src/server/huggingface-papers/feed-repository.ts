import "@tanstack/react-start/server-only";

import { and, desc, eq } from "drizzle-orm";
import type { DatabaseContext } from "#/server/database/client";
import {
	hfDailyPaperEntries,
	hfIngestionRuns,
	hfPapers,
} from "#/server/database/schema";
import { loadPaperMetadata } from "./paper-metadata";

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
			const { authorsByPaper, keywordsByPaper } = await loadPaperMetadata(
				database,
				paperIds,
			);

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
