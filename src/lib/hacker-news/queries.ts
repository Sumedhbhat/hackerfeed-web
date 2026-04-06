import { queryOptions } from "@tanstack/react-query";

const HACKER_NEWS_API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const DEFAULT_FEED_STORY_LIMIT = 12;

export const PAGE_SIZE = 12;

export const hackerNewsFeedKeys = ["top", "new", "best"] as const;

export type HackerNewsFeedKey = (typeof hackerNewsFeedKeys)[number];

export type HackerNewsStoryRecord = {
	by: string | null;
	descendants: number;
	id: number;
	score: number;
	text: string | null;
	time: number | null;
	title: string | null;
	type: "story";
	url: string | null;
};

type HackerNewsItemResponse = {
	by?: string;
	dead?: boolean;
	deleted?: boolean;
	descendants?: number;
	id?: number;
	score?: number;
	text?: string;
	time?: number;
	title?: string;
	type?: string;
	url?: string;
};

type FeedStoriesResult = {
	feed: HackerNewsFeedKey;
	ids: number[];
	stories: HackerNewsStoryRecord[];
};

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
	const response = await fetch(`${HACKER_NEWS_API_BASE_URL}${path}`, {
		headers: {
			accept: "application/json",
		},
		signal,
	});

	if (!response.ok) {
		throw new Error(`Hacker News request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

function normalizeStoryIds(payload: unknown): number[] {
	if (!Array.isArray(payload)) {
		return [];
	}

	return [...new Set(payload)]
		.map((value) => Number(value))
		.filter((value) => Number.isInteger(value) && value > 0);
}

function normalizeStoryItem(
	payload: HackerNewsItemResponse | null,
): HackerNewsStoryRecord | null {
	if (!payload || payload.type !== "story" || payload.deleted || payload.dead) {
		return null;
	}

	const storyId = payload.id;
	const descendants = payload.descendants;
	const score = payload.score;
	const time = payload.time;

	if (
		typeof storyId !== "number" ||
		!Number.isInteger(storyId) ||
		storyId <= 0
	) {
		return null;
	}

	const normalizedDescendants =
		typeof descendants === "number" && Number.isInteger(descendants)
			? descendants
			: 0;
	const normalizedScore =
		typeof score === "number" && Number.isInteger(score) ? score : 0;
	const normalizedTime =
		typeof time === "number" && Number.isInteger(time) ? time : null;

	return {
		by: payload.by ?? null,
		descendants: normalizedDescendants,
		id: storyId,
		score: normalizedScore,
		text: payload.text ?? null,
		time: normalizedTime,
		title: payload.title ?? null,
		type: "story",
		url: payload.url ?? null,
	};
}

export async function fetchFeedStoryIds(
	feed: HackerNewsFeedKey,
	signal?: AbortSignal,
): Promise<number[]> {
	return normalizeStoryIds(
		await fetchJson<unknown>(`/${feed}stories.json`, signal),
	);
}

export async function fetchStoryItem(
	storyId: number,
	signal?: AbortSignal,
): Promise<HackerNewsStoryRecord | null> {
	const payload = await fetchJson<HackerNewsItemResponse | null>(
		`/item/${storyId}.json`,
		signal,
	);

	return normalizeStoryItem(payload);
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
	const stories = await Promise.all(
		selectedIds.map((storyId) => fetchStoryItem(storyId, signal)),
	);

	return {
		feed,
		ids: selectedIds,
		stories: stories.filter(
			(story): story is HackerNewsStoryRecord => story !== null,
		),
	};
}

export function feedStoryIdsQueryOptions(feed: HackerNewsFeedKey) {
	return queryOptions({
		queryKey: ["hacker-news", "feed", feed, "ids"],
		queryFn: ({ signal }) => fetchFeedStoryIds(feed, signal),
		staleTime: 60_000,
	});
}

export function storyItemQueryOptions(storyId: number) {
	return queryOptions({
		queryKey: ["hacker-news", "story", storyId],
		queryFn: ({ signal }) => fetchStoryItem(storyId, signal),
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
