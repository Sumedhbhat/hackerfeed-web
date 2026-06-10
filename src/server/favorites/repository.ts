import "@tanstack/react-start/server-only";

import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { type D1DatabaseBinding, getD1Database } from "../database/client";

type StoryRow = {
	id: string;
	hnStoryId: number;
	title: string | null;
	url: string | null;
	text: string | null;
	score: number;
	hnPostedAt: string | null;
	authorUsername: string | null;
	commentCount: number;
	commentIds: string | null;
};

type FavoriteRow = {
	id: string;
	appUserId: string;
	storyId: string;
	createdAt: string;
};

type ListedFavoriteRow = FavoriteRow & {
	storyHnStoryId: number;
	storyTitle: string | null;
	storyUrl: string | null;
	storyText: string | null;
	storyScore: number;
	storyHnPostedAt: string | null;
	storyAuthorUsername: string | null;
	storyCommentCount: number;
	storyCommentIds: string | null;
};

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

function mapHackerNewsStory(story: HackerNewsStoryRecord) {
	return {
		hnStoryId: story.id,
		title: story.title,
		url: story.url,
		text: story.text,
		score: story.score,
		hnPostedAt: story.time ? new Date(story.time * 1000).toISOString() : null,
		authorUsername: story.by,
		commentCount: story.descendants,
		commentIds: JSON.stringify(story.kids ?? []),
	};
}

function parseCommentIds(value: string | null): number[] {
	if (!value) {
		return [];
	}

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
		id: row.id,
		hnStoryId: row.hnStoryId,
		title: row.title,
		url: row.url,
		text: row.text,
		score: row.score,
		hnPostedAt: row.hnPostedAt ? new Date(row.hnPostedAt) : null,
		authorUsername: row.authorUsername,
		commentCount: row.commentCount,
		commentIds: parseCommentIds(row.commentIds),
	};
}

function mapFavoriteRow(row: FavoriteRow): FavoriteRecord {
	return {
		id: row.id,
		appUserId: row.appUserId,
		storyId: row.storyId,
		createdAt: new Date(row.createdAt),
	};
}

async function getStoryByHnStoryId(
	database: D1DatabaseBinding,
	hnStoryId: number,
) {
	return database
		.prepare(
			`SELECT id, hnStoryId, title, url, text, score, hnPostedAt,
				authorUsername, commentCount, commentIds
			FROM stories
			WHERE hnStoryId = ?`,
		)
		.bind(hnStoryId)
		.first<StoryRow>();
}

async function getFavorite(
	database: D1DatabaseBinding,
	appUserId: string,
	storyId: string,
) {
	return database
		.prepare(
			`SELECT id, appUserId, storyId, createdAt
			FROM favorites
			WHERE appUserId = ? AND storyId = ?`,
		)
		.bind(appUserId, storyId)
		.first<FavoriteRow>();
}

export function createFavoriteRepository(database = getD1Database()) {
	return {
		async upsertStoryFromHackerNews(story: HackerNewsStoryRecord) {
			const mappedStory = mapHackerNewsStory(story);
			const id = crypto.randomUUID();

			await database
				.prepare(
					`INSERT OR IGNORE INTO stories (
						id, hnStoryId, title, url, text, score, hnPostedAt,
						authorUsername, commentCount, commentIds
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					mappedStory.hnStoryId,
					mappedStory.title,
					mappedStory.url,
					mappedStory.text,
					mappedStory.score,
					mappedStory.hnPostedAt,
					mappedStory.authorUsername,
					mappedStory.commentCount,
					mappedStory.commentIds,
				)
				.run();

			await database
				.prepare(
					`UPDATE stories
					SET title = ?, url = ?, text = ?, score = ?, hnPostedAt = ?,
						authorUsername = ?, commentCount = ?, commentIds = ?
					WHERE hnStoryId = ?`,
				)
				.bind(
					mappedStory.title,
					mappedStory.url,
					mappedStory.text,
					mappedStory.score,
					mappedStory.hnPostedAt,
					mappedStory.authorUsername,
					mappedStory.commentCount,
					mappedStory.commentIds,
					mappedStory.hnStoryId,
				)
				.run();

			const sharedStory = await getStoryByHnStoryId(
				database,
				mappedStory.hnStoryId,
			);
			if (!sharedStory) {
				throw new Error("D1 story upsert failed");
			}

			return mapStoryRow(sharedStory);
		},

		async createStoryFromHackerNewsIfMissing(story: HackerNewsStoryRecord) {
			const mappedStory = mapHackerNewsStory(story);
			const id = crypto.randomUUID();

			await database
				.prepare(
					`INSERT OR IGNORE INTO stories (
						id, hnStoryId, title, url, text, score, hnPostedAt,
						authorUsername, commentCount, commentIds
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					mappedStory.hnStoryId,
					mappedStory.title,
					mappedStory.url,
					mappedStory.text,
					mappedStory.score,
					mappedStory.hnPostedAt,
					mappedStory.authorUsername,
					mappedStory.commentCount,
					mappedStory.commentIds,
				)
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

		async createFavoriteIfMissing(appUserId: string, storyId: string) {
			const id = crypto.randomUUID();

			await database
				.prepare(
					"INSERT OR IGNORE INTO favorites (id, appUserId, storyId) VALUES (?, ?, ?)",
				)
				.bind(id, appUserId, storyId)
				.run();

			const favorite = await getFavorite(database, appUserId, storyId);
			if (!favorite) {
				throw new Error("D1 favorite upsert failed");
			}

			return mapFavoriteRow(favorite);
		},

		removeFavorite(appUserId: string, hnStoryId: number) {
			return database
				.prepare(
					`DELETE FROM favorites
					WHERE appUserId = ?
						AND storyId IN (SELECT id FROM stories WHERE hnStoryId = ?)`,
				)
				.bind(appUserId, hnStoryId)
				.run();
		},

		clearFavorites(appUserId: string) {
			return database
				.prepare("DELETE FROM favorites WHERE appUserId = ?")
				.bind(appUserId)
				.run();
		},

		async listFavorites(appUserId: string) {
			const rows = await database
				.prepare(
					`SELECT
						f.id,
						f.appUserId,
						f.storyId,
						f.createdAt,
						s.hnStoryId AS storyHnStoryId,
						s.title AS storyTitle,
						s.url AS storyUrl,
						s.text AS storyText,
						s.score AS storyScore,
						s.hnPostedAt AS storyHnPostedAt,
						s.authorUsername AS storyAuthorUsername,
						s.commentCount AS storyCommentCount,
						s.commentIds AS storyCommentIds
					FROM favorites f
					INNER JOIN stories s ON s.id = f.storyId
					WHERE f.appUserId = ?
					ORDER BY f.createdAt DESC`,
				)
				.bind(appUserId)
				.all<ListedFavoriteRow>();

			return (rows.results ?? []).map(
				(row): ListedFavoriteRecord => ({
					...mapFavoriteRow(row),
					story: {
						id: row.storyId,
						hnStoryId: row.storyHnStoryId,
						title: row.storyTitle,
						url: row.storyUrl,
						text: row.storyText,
						score: row.storyScore,
						hnPostedAt: row.storyHnPostedAt
							? new Date(row.storyHnPostedAt)
							: null,
						authorUsername: row.storyAuthorUsername,
						commentCount: row.storyCommentCount,
						commentIds: parseCommentIds(row.storyCommentIds),
					},
				}),
			);
		},
	};
}

export type FavoriteRepository = ReturnType<typeof createFavoriteRepository>;
