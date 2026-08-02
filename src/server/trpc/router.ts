import "@tanstack/react-start/server-only";

import * as Sentry from "@sentry/cloudflare";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import {
	favoriteStoriesOutputSchema,
	favoriteStoryIdInputSchema,
	hackerNewsStorySchema,
	importLocalFavoritesInputSchema,
} from "#/lib/favorites/schemas";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
	type PaperFavoritesListInput,
	type PaperFavoritesListOutput,
	paperFavoriteInputSchema,
	paperFavoritesListInputSchema,
	paperFavoritesListOutputSchema,
} from "#/lib/paper-favorites/schemas";
import {
	type PaperEdition,
	paperEditionInputSchema,
	paperEditionOutputSchema,
} from "#/lib/papers/schemas";
import { paperViewInputSchema } from "#/lib/view-activity/schemas";
import { createFavoriteServiceFromDatabase } from "#/server/favorites/service";
import { createHuggingFacePaperFeedServiceFromDatabase } from "#/server/huggingface-papers/feed";
import {
	createPaperFavoriteServiceFromDatabase,
	InvalidPaperFavoriteCursorError,
	PaperNotFoundError,
} from "#/server/paper-favorites/service";
import {
	createViewActivityServiceFromDatabase,
	ViewedPaperNotFoundError,
} from "#/server/view-activity/service";
import type { TrpcContext } from "./context";

type ListedFavorite = {
	story: {
		hnStoryId: number;
		title: string | null;
		url: string | null;
		text: string | null;
		score: number;
		hnPostedAt: Date | null;
		authorUsername: string | null;
		commentCount: number;
		commentIds: number[];
	};
};

type FavoritesApiService = {
	listFavorites(user: TrpcContext["user"]): Promise<ListedFavorite[]>;
	addFavorite(
		user: TrpcContext["user"],
		story: HackerNewsStoryRecord,
	): Promise<unknown>;
	importLocalFavorites(
		user: TrpcContext["user"],
		stories: HackerNewsStoryRecord[],
	): Promise<unknown>;
	removeFavorite(user: TrpcContext["user"], hnStoryId: number): Promise<void>;
	clearFavorites(user: TrpcContext["user"]): Promise<void>;
};

type PapersApiService = {
	getEdition(editionDate?: string): Promise<PaperEdition>;
};

type PaperFavoritesApiService = {
	listFavorites(
		user: TrpcContext["user"],
		input: PaperFavoritesListInput,
	): Promise<PaperFavoritesListOutput>;
	addFavorite(user: TrpcContext["user"], arxivId: string): Promise<void>;
	removeFavorite(user: TrpcContext["user"], arxivId: string): Promise<void>;
	clearFavorites(user: TrpcContext["user"]): Promise<void>;
};

type ViewActivityApiService = {
	recordStoryView(
		user: TrpcContext["user"],
		story: HackerNewsStoryRecord,
	): Promise<void>;
	recordPaperView(user: TrpcContext["user"], arxivId: string): Promise<void>;
};

const t = initTRPC.context<TrpcContext>().create({
	transformer: superjson,
});

const tracedProcedure = t.procedure.use(Sentry.trpcMiddleware());

const protectedProcedure = tracedProcedure.use(({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}

	return next({ ctx: { database: ctx.database, user: ctx.user } });
});

function mapListedFavoriteToStory({
	story,
}: ListedFavorite): HackerNewsStoryRecord {
	return {
		by: story.authorUsername,
		descendants: story.commentCount,
		id: story.hnStoryId,
		kids: story.commentIds,
		score: story.score,
		text: story.text,
		time: story.hnPostedAt
			? Math.floor(story.hnPostedAt.getTime() / 1_000)
			: null,
		title: story.title,
		type: "story",
		url: story.url,
	};
}

function getFavoritesApiService(
	database: TrpcContext["database"],
	favorites?: FavoritesApiService,
) {
	if (favorites) return favorites;

	return createFavoriteServiceFromDatabase(database);
}

function getPapersApiService(
	database: TrpcContext["database"],
	papers?: PapersApiService,
) {
	if (papers) return papers;

	return createHuggingFacePaperFeedServiceFromDatabase(database);
}

function getPaperFavoritesApiService(
	database: TrpcContext["database"],
	paperFavorites?: PaperFavoritesApiService,
) {
	if (paperFavorites) return paperFavorites;

	return createPaperFavoriteServiceFromDatabase(database);
}

function getViewActivityApiService(
	database: TrpcContext["database"],
	viewActivity?: ViewActivityApiService,
) {
	if (viewActivity) return viewActivity;

	return createViewActivityServiceFromDatabase(database);
}

function mapPaperFavoriteError(error: unknown): never {
	if (error instanceof PaperNotFoundError) {
		throw new TRPCError({ code: "NOT_FOUND", message: error.message });
	}

	if (error instanceof InvalidPaperFavoriteCursorError) {
		throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
	}

	throw error;
}

function mapViewActivityError(error: unknown): never {
	if (error instanceof ViewedPaperNotFoundError) {
		throw new TRPCError({ code: "NOT_FOUND", message: error.message });
	}

	throw error;
}

export function createAppRouter(
	favorites?: FavoritesApiService,
	papers?: PapersApiService,
	paperFavorites?: PaperFavoritesApiService,
	viewActivity?: ViewActivityApiService,
) {
	return t.router({
		favorites: t.router({
			list: protectedProcedure
				.output(favoriteStoriesOutputSchema)
				.query(async ({ ctx }) => {
					const service = getFavoritesApiService(ctx.database, favorites);
					const favoritesList = await service.listFavorites(ctx.user);

					return favoritesList.map(mapListedFavoriteToStory);
				}),

			add: protectedProcedure
				.input(hackerNewsStorySchema)
				.output(hackerNewsStorySchema)
				.mutation(async ({ ctx, input }) => {
					const service = getFavoritesApiService(ctx.database, favorites);
					await service.addFavorite(ctx.user, input);

					return input;
				}),

			remove: protectedProcedure
				.input(favoriteStoryIdInputSchema)
				.mutation(async ({ ctx, input }) => {
					const service = getFavoritesApiService(ctx.database, favorites);
					await service.removeFavorite(ctx.user, input.hnStoryId);
				}),

			clear: protectedProcedure.mutation(async ({ ctx }) => {
				const service = getFavoritesApiService(ctx.database, favorites);
				await service.clearFavorites(ctx.user);
			}),

			importLocal: protectedProcedure
				.input(importLocalFavoritesInputSchema)
				.output(favoriteStoriesOutputSchema)
				.mutation(async ({ ctx, input }) => {
					const service = getFavoritesApiService(ctx.database, favorites);
					await service.importLocalFavorites(ctx.user, input.stories);

					return input.stories;
				}),
		}),
		papers: t.router({
			edition: protectedProcedure
				.input(paperEditionInputSchema)
				.output(paperEditionOutputSchema)
				.query(async ({ ctx, input }) => {
					const service = getPapersApiService(ctx.database, papers);
					return service.getEdition(input.editionDate);
				}),
		}),
		paperFavorites: t.router({
			list: protectedProcedure
				.input(paperFavoritesListInputSchema)
				.output(paperFavoritesListOutputSchema)
				.query(async ({ ctx, input }) => {
					const service = getPaperFavoritesApiService(
						ctx.database,
						paperFavorites,
					);

					try {
						return await service.listFavorites(ctx.user, input);
					} catch (error) {
						return mapPaperFavoriteError(error);
					}
				}),

			add: protectedProcedure
				.input(paperFavoriteInputSchema)
				.output(paperFavoriteInputSchema)
				.mutation(async ({ ctx, input }) => {
					const service = getPaperFavoritesApiService(
						ctx.database,
						paperFavorites,
					);

					try {
						await service.addFavorite(ctx.user, input.arxivId);
						return input;
					} catch (error) {
						return mapPaperFavoriteError(error);
					}
				}),

			remove: protectedProcedure
				.input(paperFavoriteInputSchema)
				.mutation(async ({ ctx, input }) => {
					const service = getPaperFavoritesApiService(
						ctx.database,
						paperFavorites,
					);
					await service.removeFavorite(ctx.user, input.arxivId);
				}),

			clear: protectedProcedure.mutation(async ({ ctx }) => {
				const service = getPaperFavoritesApiService(
					ctx.database,
					paperFavorites,
				);
				await service.clearFavorites(ctx.user);
			}),
		}),
		views: t.router({
			story: protectedProcedure
				.input(hackerNewsStorySchema)
				.mutation(async ({ ctx, input }) => {
					const service = getViewActivityApiService(ctx.database, viewActivity);
					await service.recordStoryView(ctx.user, input);
				}),

			paper: protectedProcedure
				.input(paperViewInputSchema)
				.mutation(async ({ ctx, input }) => {
					const service = getViewActivityApiService(ctx.database, viewActivity);

					try {
						await service.recordPaperView(ctx.user, input.arxivId);
					} catch (error) {
						return mapViewActivityError(error);
					}
				}),
		}),
	});
}

export type AppRouter = ReturnType<typeof createAppRouter>;
