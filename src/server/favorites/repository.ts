import "@tanstack/react-start/server-only";

import { and, desc, eq, inArray, notExists, type SQL } from "drizzle-orm";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { activityEventSelection } from "../activity/events";
import type { DatabaseContext } from "../database/client";
import {
	activityEvents,
	favorites as favoritesTable,
	stories as storiesTable,
} from "../database/schema";
import { mapHackerNewsStory } from "../stories/persistence";

type StoryRow = typeof storiesTable.$inferSelect;
type FavoriteRow = typeof favoritesTable.$inferSelect;

type StoryRecord = {
	id: string;
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

type FavoriteRecord = {
	id: string;
	appUserId: string;
	storyId: string;
	createdAt: Date;
};

type ListedFavoriteRecord = FavoriteRecord & {
	story: StoryRecord;
};

function parseCommentIds(value: string | null): number[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((id): id is number => typeof id === "number")
			: [];
	} catch {
		return [];
	}
}

function mapStoryRow(row: StoryRow): StoryRecord {
	return {
		...row,
		hnPostedAt: row.hnPostedAt ? new Date(row.hnPostedAt) : null,
		commentIds: parseCommentIds(row.commentIds),
	};
}

function mapFavoriteRow(row: FavoriteRow): FavoriteRecord {
	return {
		...row,
		createdAt: new Date(row.createdAt),
	};
}

async function getStoryByHnStoryId(
	database: DatabaseContext,
	hnStoryId: number,
) {
	const [story] = await database
		.select()
		.from(storiesTable)
		.where(eq(storiesTable.hnStoryId, hnStoryId))
		.limit(1)
		.all();

	return story;
}

async function getFavorite(
	database: DatabaseContext,
	appUserId: string,
	storyId: string,
) {
	const [favorite] = await database
		.select()
		.from(favoritesTable)
		.where(
			and(
				eq(favoritesTable.appUserId, appUserId),
				eq(favoritesTable.storyId, storyId),
			),
		)
		.limit(1)
		.all();

	return favorite;
}

export function createFavoriteRepository(database: DatabaseContext) {
	async function removeFavorites(appUserId: string, where: SQL | undefined) {
		await database.batch([
			database.insert(activityEvents).select(
				database
					.select(
						activityEventSelection(appUserId, "story.unfavorited", {
							storyId: favoritesTable.storyId,
						}),
					)
					.from(favoritesTable)
					.where(where),
			),
			database.delete(favoritesTable).where(where),
		]);
	}

	return {
		async upsertStoryFromHackerNews(story: HackerNewsStoryRecord) {
			const mappedStory = mapHackerNewsStory(story);

			const [sharedStory] = await database
				.insert(storiesTable)
				.values(mappedStory)
				.onConflictDoUpdate({
					target: storiesTable.hnStoryId,
					set: mappedStory,
				})
				.returning()
				.all();

			if (!sharedStory) {
				throw new Error("D1 story upsert failed");
			}

			return mapStoryRow(sharedStory);
		},

		async createStoryFromHackerNewsIfMissing(story: HackerNewsStoryRecord) {
			const mappedStory = mapHackerNewsStory(story);

			await database
				.insert(storiesTable)
				.values(mappedStory)
				.onConflictDoNothing({ target: storiesTable.hnStoryId })
				.run();

			const sharedStory = await getStoryByHnStoryId(
				database,
				mappedStory.hnStoryId,
			);
			if (!sharedStory) {
				throw new Error("D1 story insert failed");
			}

			return mapStoryRow(sharedStory);
		},

		async addFavorite(appUserId: string, storyId: string) {
			const recordEvent = database.insert(activityEvents).select(
				database
					.select(
						activityEventSelection(appUserId, "story.favorited", {
							storyId: storiesTable.id,
						}),
					)
					.from(storiesTable)
					.where(
						and(
							eq(storiesTable.id, storyId),
							notExists(
								database
									.select({ id: favoritesTable.id })
									.from(favoritesTable)
									.where(
										and(
											eq(favoritesTable.appUserId, appUserId),
											eq(favoritesTable.storyId, storyId),
										),
									),
							),
						),
					),
			);
			const insertFavorite = database
				.insert(favoritesTable)
				.values({ appUserId, storyId })
				.onConflictDoNothing({
					target: [favoritesTable.appUserId, favoritesTable.storyId],
				});

			await database.batch([recordEvent, insertFavorite]);

			const favorite = await getFavorite(database, appUserId, storyId);
			if (!favorite) {
				throw new Error("D1 favorite upsert failed");
			}

			return mapFavoriteRow(favorite);
		},

		async createFavoriteIfMissing(appUserId: string, storyId: string) {
			await database
				.insert(favoritesTable)
				.values({ appUserId, storyId })
				.onConflictDoNothing({
					target: [favoritesTable.appUserId, favoritesTable.storyId],
				})
				.run();

			const favorite = await getFavorite(database, appUserId, storyId);
			if (!favorite) {
				throw new Error("D1 favorite upsert failed");
			}

			return mapFavoriteRow(favorite);
		},

		async removeFavorite(appUserId: string, hnStoryId: number) {
			const storyIds = database
				.select({ id: storiesTable.id })
				.from(storiesTable)
				.where(eq(storiesTable.hnStoryId, hnStoryId));

			await removeFavorites(
				appUserId,
				and(
					eq(favoritesTable.appUserId, appUserId),
					inArray(favoritesTable.storyId, storyIds),
				),
			);
		},

		async clearFavorites(appUserId: string) {
			await removeFavorites(appUserId, eq(favoritesTable.appUserId, appUserId));
		},

		async listFavorites(appUserId: string) {
			const rows = await database
				.select({
					favorite: favoritesTable,
					story: storiesTable,
				})
				.from(favoritesTable)
				.innerJoin(storiesTable, eq(storiesTable.id, favoritesTable.storyId))
				.where(eq(favoritesTable.appUserId, appUserId))
				.orderBy(desc(favoritesTable.createdAt), desc(favoritesTable.id))
				.all();

			return rows.map(
				(row): ListedFavoriteRecord => ({
					...mapFavoriteRow(row.favorite),
					story: mapStoryRow(row.story),
				}),
			);
		},
	};
}

export type FavoriteRepository = ReturnType<typeof createFavoriteRepository>;
