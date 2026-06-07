import "@tanstack/react-start/server-only";

import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { type DatabaseClient, db } from "../database/client";

function mapHackerNewsStory(story: HackerNewsStoryRecord) {
	return {
		hnStoryId: story.id,
		title: story.title,
		url: story.url,
		text: story.text,
		score: story.score,
		hnPostedAt: story.time ? new Date(story.time * 1000) : null,
		authorUsername: story.by,
		commentCount: story.descendants,
		commentIds: story.kids,
	};
}

export function createFavoriteRepository(database: DatabaseClient = db) {
	return {
		upsertStoryFromHackerNews(story: HackerNewsStoryRecord) {
			const { hnStoryId, ...mutableStoryData } = mapHackerNewsStory(story);

			return database.story.upsert({
				where: { hnStoryId },
				update: mutableStoryData,
				create: { hnStoryId, ...mutableStoryData },
			});
		},

		createStoryFromHackerNewsIfMissing(story: HackerNewsStoryRecord) {
			return database.story.upsert({
				where: { hnStoryId: story.id },
				update: {},
				create: mapHackerNewsStory(story),
			});
		},

		createFavoriteIfMissing(appUserId: string, storyId: string) {
			return database.favorite.upsert({
				where: { appUserId_storyId: { appUserId, storyId } },
				update: {},
				create: { appUserId, storyId },
			});
		},

		removeFavorite(appUserId: string, hnStoryId: number) {
			return database.favorite.deleteMany({
				where: { appUserId, story: { hnStoryId } },
			});
		},

		clearFavorites(appUserId: string) {
			return database.favorite.deleteMany({ where: { appUserId } });
		},

		listFavorites(appUserId: string) {
			return database.favorite.findMany({
				where: { appUserId },
				include: { story: true },
				orderBy: { createdAt: "desc" },
			});
		},
	};
}

export type FavoriteRepository = ReturnType<typeof createFavoriteRepository>;
