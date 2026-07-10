import "@tanstack/react-start/server-only";

import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import type { DatabaseContext } from "#/server/database/client";
import { hfPapers, paperFavorites } from "#/server/database/schema";
import { loadPaperMetadata } from "#/server/huggingface-papers/paper-metadata";

export type PaperFavoriteCursor = {
	createdAt: string;
	id: string;
};

export type PaperFavoriteListRecord = {
	aiSummary: string | null;
	arxivId: string;
	authors: string[];
	githubRepo: string | null;
	keywords: string[];
	paperPublishedAt: string;
	projectPage: string | null;
	savedAt: string;
	summary: string;
	title: string;
	upvotes: number;
};

async function getFavorite(
	database: DatabaseContext,
	appUserId: string,
	paperId: string,
) {
	const [favorite] = await database
		.select()
		.from(paperFavorites)
		.where(
			and(
				eq(paperFavorites.appUserId, appUserId),
				eq(paperFavorites.paperId, paperId),
			),
		)
		.limit(1);

	return favorite;
}

export function createPaperFavoriteRepository(database: DatabaseContext) {
	return {
		async findPaperByArxivId(arxivId: string) {
			const [paper] = await database
				.select({ id: hfPapers.id })
				.from(hfPapers)
				.where(eq(hfPapers.arxivId, arxivId))
				.limit(1);

			return paper ?? null;
		},

		async createFavoriteIfMissing(appUserId: string, paperId: string) {
			await database
				.insert(paperFavorites)
				.values({ appUserId, paperId })
				.onConflictDoNothing({
					target: [paperFavorites.appUserId, paperFavorites.paperId],
				})
				.run();

			const favorite = await getFavorite(database, appUserId, paperId);
			if (!favorite) {
				throw new Error("D1 paper favorite upsert failed");
			}

			return favorite;
		},

		removeFavorite(appUserId: string, arxivId: string) {
			const paperIds = database
				.select({ id: hfPapers.id })
				.from(hfPapers)
				.where(eq(hfPapers.arxivId, arxivId));

			return database
				.delete(paperFavorites)
				.where(
					and(
						eq(paperFavorites.appUserId, appUserId),
						inArray(paperFavorites.paperId, paperIds),
					),
				)
				.run();
		},

		clearFavorites(appUserId: string) {
			return database
				.delete(paperFavorites)
				.where(eq(paperFavorites.appUserId, appUserId))
				.run();
		},

		async listFavorites(
			appUserId: string,
			limit: number,
			cursor?: PaperFavoriteCursor,
		) {
			const cursorPredicate = cursor
				? or(
						lt(paperFavorites.createdAt, cursor.createdAt),
						and(
							eq(paperFavorites.createdAt, cursor.createdAt),
							lt(paperFavorites.id, cursor.id),
						),
					)
				: undefined;
			const rows = await database
				.select({
					favoriteId: paperFavorites.id,
					savedAt: paperFavorites.createdAt,
					paperId: hfPapers.id,
					arxivId: hfPapers.arxivId,
					title: hfPapers.title,
					summary: hfPapers.summary,
					aiSummary: hfPapers.aiSummary,
					paperPublishedAt: hfPapers.paperPublishedAt,
					upvotes: hfPapers.upvotes,
					projectPage: hfPapers.projectPage,
					githubRepo: hfPapers.githubRepo,
				})
				.from(paperFavorites)
				.innerJoin(hfPapers, eq(hfPapers.id, paperFavorites.paperId))
				.where(
					cursorPredicate
						? and(eq(paperFavorites.appUserId, appUserId), cursorPredicate)
						: eq(paperFavorites.appUserId, appUserId),
				)
				.orderBy(desc(paperFavorites.createdAt), desc(paperFavorites.id))
				.limit(limit + 1);

			const hasNextPage = rows.length > limit;
			const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
			if (pageRows.length === 0) {
				return { items: [], nextCursor: null };
			}

			const { authorsByPaper, keywordsByPaper } = await loadPaperMetadata(
				database,
				pageRows.map((row) => row.paperId),
			);
			const lastRow = pageRows.at(-1);

			return {
				items: pageRows.map(({ favoriteId: _, paperId, ...paper }) => ({
					...paper,
					authors: authorsByPaper.get(paperId) ?? [],
					keywords: keywordsByPaper.get(paperId) ?? [],
				})),
				nextCursor:
					hasNextPage && lastRow
						? { createdAt: lastRow.savedAt, id: lastRow.favoriteId }
						: null,
			};
		},
	};
}

export type PaperFavoriteRepository = ReturnType<
	typeof createPaperFavoriteRepository
>;
