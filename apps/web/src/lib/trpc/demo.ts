import type { AppRouter } from "@hackerfeed/api-client/trpc";
import {
	type FavoriteStoryInput,
	favoriteStoryIdInputSchema,
	hackerNewsStorySchema,
	importLocalFavoritesInputSchema,
} from "@hackerfeed/contracts/favorites";
import {
	paperFavoriteInputSchema,
	paperFavoritesListInputSchema,
	type SavedPaper,
} from "@hackerfeed/contracts/paper-favorites";
import { paperEditionInputSchema } from "@hackerfeed/contracts/papers";
import {
	paperViewInputSchema,
	storyViewInputSchema,
} from "@hackerfeed/contracts/view-activity";
import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { authorRows } from "#/demo-data/database/authors";
import { dailyPaperEntryRows } from "#/demo-data/database/daily-paper-entries";
import { favoriteRows } from "#/demo-data/database/favorites";
import { paperAuthorRows } from "#/demo-data/database/paper-authors";
import { paperFavoriteRows } from "#/demo-data/database/paper-favorites";
import { paperKeywordRows } from "#/demo-data/database/paper-keywords";
import { paperRows } from "#/demo-data/database/papers";
import { storyRows } from "#/demo-data/database/stories";

const paperPresentations = paperRows.map((paper) => ({
	arxivId: paper.arxivId,
	title: paper.title,
	summary: paper.aiSummary ?? paper.summary,
	abstract:
		paper.aiSummary !== null && paper.aiSummary !== paper.summary
			? paper.summary
			: null,
	paperPublishedAt: paper.paperPublishedAt,
	upvotes: paper.upvotes,
	paperUrl: `https://huggingface.co/papers/${paper.arxivId}`,
	projectPage: paper.projectPage,
	githubRepo: paper.githubRepo,
	authors: paperAuthorRows
		.filter((row) => row.paperId === paper.id)
		.sort((a, b) => a.position - b.position)
		.map(
			(row) =>
				authorRows.find((author) => author.id === row.authorId)?.name ?? "",
		),
	keywords: paperKeywordRows
		.filter((row) => row.paperId === paper.id)
		.sort((a, b) => a.position - b.position)
		.map((row) => row.keywordOriginal),
}));

/** One instance per browser page. A reload discards every mutation. */
export function createDemoApi() {
	const favorites = new Map<number, FavoriteStoryInput>();
	for (const row of favoriteRows) {
		const story = storyRows.find((story) => story.id === row.storyId);
		if (story)
			favorites.set(story.hnStoryId, {
				by: story.authorUsername,
				descendants: story.commentCount,
				id: story.hnStoryId,
				kids: JSON.parse(story.commentIds),
				score: story.score,
				text: story.text,
				time: story.hnPostedAt ? Date.parse(story.hnPostedAt) / 1000 : null,
				title: story.title,
				type: "story",
				url: story.url,
			});
	}
	const paperFavorites = new Map<string, SavedPaper>();
	for (const row of paperFavoriteRows) {
		const index = paperRows.findIndex((paper) => paper.id === row.paperId);
		paperFavorites.set(paperRows[index].arxivId, {
			...paperPresentations[index],
			savedAt: `${row.createdAt.replace(" ", "T")}Z`,
		});
	}
	const storyViews = new Set<number>();
	const paperViews = new Set<string>();
	const findPaper = (arxivId: string) => {
		const paper = paperPresentations.find((paper) => paper.arxivId === arxivId);
		if (!paper) throw new Error(`Paper ${arxivId} was not found`);
		return paper;
	};

	return (path: string, input: unknown): unknown => {
		switch (path) {
			case "favorites.list":
				return structuredClone([...favorites.values()].reverse());
			case "favorites.add": {
				const story = hackerNewsStorySchema.parse(input);
				if (!favorites.has(story.id)) favorites.set(story.id, story);
				return story;
			}
			case "favorites.importLocal": {
				const { stories } = importLocalFavoritesInputSchema.parse(input);
				for (const story of stories)
					if (!favorites.has(story.id)) favorites.set(story.id, story);
				return stories;
			}
			case "favorites.remove":
				favorites.delete(favoriteStoryIdInputSchema.parse(input).hnStoryId);
				return;
			case "favorites.clear":
				favorites.clear();
				return;
			case "papers.edition": {
				const { editionDate: requestedDate } =
					paperEditionInputSchema.parse(input);
				const editionDate =
					dailyPaperEntryRows
						.map((entry) => entry.editionDate)
						.sort()
						.reverse()
						.find(
							(date) => requestedDate === undefined || date === requestedDate,
						) ?? null;
				const papers = dailyPaperEntryRows
					.filter((row) => row.editionDate === editionDate)
					.map((entry) => ({
						...paperPresentations[
							paperRows.findIndex((paper) => paper.id === entry.paperId)
						],
						rank: entry.rank,
						entryPublishedAt: entry.entryPublishedAt,
					}))
					.sort((a, b) => a.rank - b.rank);
				const keywords = new Map<
					string,
					{ keyword: string; paperCount: number; totalUpvotes: number }
				>();
				for (const paper of papers)
					for (const keyword of new Set(paper.keywords)) {
						const key = keyword;
						const stats = keywords.get(key) ?? {
							keyword,
							paperCount: 0,
							totalUpvotes: 0,
						};
						stats.paperCount++;
						stats.totalUpvotes += paper.upvotes;
						keywords.set(key, stats);
					}
				return structuredClone({
					editionDate,
					papers,
					popularKeywords: [...keywords.values()].sort(
						(a, b) =>
							b.paperCount - a.paperCount ||
							b.totalUpvotes - a.totalUpvotes ||
							a.keyword.localeCompare(b.keyword),
					),
				});
			}
			case "paperFavorites.list": {
				const { limit, cursor } = paperFavoritesListInputSchema.parse(input);
				const all = [...paperFavorites.values()].sort(
					(a, b) =>
						b.savedAt.localeCompare(a.savedAt) ||
						b.arxivId.localeCompare(a.arxivId),
				);
				const index = cursor
					? all.findIndex((paper) => paper.arxivId === cursor)
					: -1;
				if (cursor && index < 0)
					throw new Error("Invalid paper favorites cursor");
				const page = all.slice(index + 1, index + 1 + limit);
				return structuredClone({
					items: page,
					nextCursor:
						index + 1 + limit < all.length
							? (page.at(-1)?.arxivId ?? null)
							: null,
				});
			}
			case "paperFavorites.add": {
				const value = paperFavoriteInputSchema.parse(input);
				const paper = findPaper(value.arxivId);
				if (!paperFavorites.has(value.arxivId))
					paperFavorites.set(value.arxivId, {
						...paper,
						savedAt: new Date().toISOString(),
					});
				return value;
			}
			case "paperFavorites.remove":
				paperFavorites.delete(paperFavoriteInputSchema.parse(input).arxivId);
				return;
			case "paperFavorites.clear":
				paperFavorites.clear();
				return;
			case "views.story":
				storyViews.add(storyViewInputSchema.parse(input).story.id);
				return;
			case "views.paper": {
				const { arxivId } = paperViewInputSchema.parse(input);
				findPaper(arxivId);
				paperViews.add(arxivId);
				return;
			}
			default:
				throw new Error(`hackerfeed-demo-data has no procedure ${path}`);
		}
	};
}

let browserApi: ReturnType<typeof createDemoApi> | undefined;
export const demoLink: TRPCLink<AppRouter> =
	() =>
	({ op }) =>
		observable((observer) => {
			try {
				if (typeof window === "undefined")
					throw new Error("Demo state is browser-only");
				browserApi ??= createDemoApi();
				observer.next({ result: { data: browserApi(op.path, op.input) } });
				observer.complete();
			} catch (error) {
				observer.error(
					TRPCClientError.from(
						error instanceof Error ? error : new Error(String(error)),
					),
				);
			}
		});
