import { queryOptions } from "@tanstack/react-query";
import { http } from "#/lib/http/client";
import { logger } from "#/lib/logger";
import {
	type HackerNewsCommentRecord,
	type HackerNewsFeedKey,
	type HackerNewsItemResponse,
	type HackerNewsStoryRecord,
	normalizeHackerNewsComment,
	normalizeHackerNewsStory,
	normalizeHackerNewsStoryIds,
} from "./schemas";

export {
	type HackerNewsCommentRecord,
	HackerNewsFeedKey,
	type HackerNewsStoryRecord,
} from "./schemas";

const HACKER_NEWS_API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const DEFAULT_FEED_STORY_LIMIT = 12;

export const PAGE_SIZE = 12;

type FeedStoriesResult = {
	feed: HackerNewsFeedKey;
	ids: number[];
	stories: HackerNewsStoryRecord[];
};

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
	const url = `${HACKER_NEWS_API_BASE_URL}${path}`;
	let response: Response;

	try {
		response = await http.get(url, {
			headers: {
				accept: "application/json",
			},
			signal,
		});
	} catch (err) {
		logger.error("HN API network error", {
			url,
			err: err instanceof Error ? err.message : String(err),
		});
		throw err;
	}

	if (!response.ok) {
		let body = "";
		try {
			body = (await response.text()).slice(0, 500);
		} catch {
			// ignore body read failure
		}
		logger.error("HN API non-2xx response", {
			url,
			status: response.status,
			body,
		});
		throw new Error(`Hacker News request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

export async function fetchFeedStoryIds(
	feed: HackerNewsFeedKey,
	signal?: AbortSignal,
): Promise<number[]> {
	return normalizeHackerNewsStoryIds(
		await fetchJson<unknown>(`/${feed}stories.json`, signal),
	);
}

export async function fetchStory(
	storyId: number,
	signal?: AbortSignal,
): Promise<HackerNewsStoryRecord | null> {
	const payload = await fetchJson<HackerNewsItemResponse | null>(
		`/item/${storyId}.json`,
		signal,
	);

	return normalizeHackerNewsStory(payload);
}

export async function fetchFeedStories(
	feed: HackerNewsFeedKey,
	{
		limit = DEFAULT_FEED_STORY_LIMIT,
		signal,
	}: { limit?: number; signal?: AbortSignal } = {},
): Promise<FeedStoriesResult> {
	const ids = await fetchFeedStoryIds(feed, signal);
	const selectedIds = ids.slice(0, Math.max(limit, 0));

	logger.info("HN feed story batch start", {
		feed,
		requested: selectedIds.length,
		totalIds: ids.length,
	});

	const stories = await Promise.all(
		selectedIds.map((storyId) => fetchStory(storyId, signal)),
	);

	const nonNull = stories.filter(
		(story): story is HackerNewsStoryRecord => story !== null,
	);

	logger.info("HN feed story batch complete", {
		feed,
		requested: selectedIds.length,
		returned: nonNull.length,
	});

	return {
		feed,
		ids: selectedIds,
		stories: nonNull,
	};
}

export function feedStoryIdsQueryOptions(feed: HackerNewsFeedKey) {
	return queryOptions({
		queryKey: ["hacker-news", "feed", feed, "ids"],
		queryFn: ({ signal }) => fetchFeedStoryIds(feed, signal),
		staleTime: 60_000,
	});
}

export function storyQueryOptions(storyId: number) {
	return queryOptions({
		queryKey: ["hacker-news", "story", storyId],
		queryFn: ({ signal }) => fetchStory(storyId, signal),
		staleTime: 300_000,
	});
}

export async function fetchComment(
	commentId: number,
	signal?: AbortSignal,
): Promise<HackerNewsCommentRecord | null> {
	const payload = await fetchJson<HackerNewsItemResponse | null>(
		`/item/${commentId}.json`,
		signal,
	);
	return normalizeHackerNewsComment(payload);
}

export function commentQueryOptions(commentId: number) {
	return queryOptions({
		queryKey: ["hacker-news", "comment", commentId],
		queryFn: ({ signal }) => fetchComment(commentId, signal),
		staleTime: 300_000,
	});
}

export function feedStoriesQueryOptions(
	feed: HackerNewsFeedKey,
	limit = DEFAULT_FEED_STORY_LIMIT,
) {
	return queryOptions({
		queryKey: ["hacker-news", "feed", feed, "stories", { limit }],
		queryFn: ({ signal }) => fetchFeedStories(feed, { limit, signal }),
		staleTime: 60_000,
	});
}
