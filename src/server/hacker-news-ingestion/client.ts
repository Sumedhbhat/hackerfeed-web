import "@tanstack/react-start/server-only";

import {
	HackerNewsFeedKey,
	type HackerNewsIngestionStory,
	type HackerNewsItemResponse,
	normalizeHackerNewsStoryForIngestion,
	normalizeHackerNewsStoryIds,
} from "#/lib/hacker-news/schemas";
import { http } from "#/lib/http/client";

export const HACKER_NEWS_SOURCE_BASE_URL =
	"https://hacker-news.firebaseio.com/v0";
// Three feed requests plus up to 45 deduplicated item requests stay within the
// Workers Free external-subrequest limit. Raise to 100 after confirming Paid.
export const HACKER_NEWS_PER_FEED_LIMIT = 15;
export const HACKER_NEWS_FETCH_CONCURRENCY = 6;

const RETRY_DELAYS_MS = [1_000, 3_000] as const;
const FEEDS = [
	HackerNewsFeedKey.Top,
	HackerNewsFeedKey.New,
	HackerNewsFeedKey.Best,
] as const;

export type HackerNewsFeedRanks = {
	topRank: number | null;
	newRank: number | null;
	bestRank: number | null;
};

export type HackerNewsFetchedStory = {
	story: HackerNewsIngestionStory;
	ranks: HackerNewsFeedRanks;
};

export type HackerNewsIngestionSnapshot = {
	feedIdCounts: Record<HackerNewsFeedKey, number>;
	uniqueSelectedCount: number;
	fetchedCount: number;
	skippedCount: number;
	stories: HackerNewsFetchedStory[];
};

type ClientOptions = {
	fetch?: typeof fetch;
	sleep?: (milliseconds: number) => Promise<void>;
	perFeedLimit?: number;
	concurrency?: number;
};

function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryableStatus(status: number): boolean {
	return status === 429 || status >= 500;
}

async function fetchJson(
	path: string,
	options: Pick<ClientOptions, "fetch" | "sleep">,
): Promise<unknown> {
	const sleepImpl = options.sleep ?? sleep;
	const url = `${HACKER_NEWS_SOURCE_BASE_URL}${path}`;

	for (let attempt = 0; attempt < 3; attempt += 1) {
		let response: Response;
		try {
			response = await http.get(url, {
				fetch: options.fetch,
				headers: {
					Accept: "application/json",
					"User-Agent": "hackerfeed-web/1.0",
				},
			});
		} catch (error) {
			if (attempt === 2) throw error;
			await sleepImpl(RETRY_DELAYS_MS[attempt]);
			continue;
		}

		if (response.ok) return response.json();
		if (!isRetryableStatus(response.status) || attempt === 2) {
			throw new Error(`Hacker News request failed with ${response.status}`);
		}
		await sleepImpl(RETRY_DELAYS_MS[attempt]);
	}

	throw new Error("Hacker News retry loop exhausted");
}

function addRank(
	ranksByStoryId: Map<number, HackerNewsFeedRanks>,
	feed: HackerNewsFeedKey,
	storyId: number,
	rank: number,
): void {
	const ranks = ranksByStoryId.get(storyId) ?? {
		topRank: null,
		newRank: null,
		bestRank: null,
	};
	ranks[`${feed}Rank`] = rank;
	ranksByStoryId.set(storyId, ranks);
}

async function mapWithConcurrency<T, R>(
	values: T[],
	concurrency: number,
	mapper: (value: T) => Promise<R>,
): Promise<R[]> {
	if (values.length === 0) return [];

	const results = new Array<R>(values.length);
	let nextIndex = 0;
	const workers = Array.from(
		{ length: Math.min(Math.max(1, concurrency), values.length) },
		async () => {
			while (nextIndex < values.length) {
				const index = nextIndex;
				nextIndex += 1;
				const value = values[index];
				if (value !== undefined) results[index] = await mapper(value);
			}
		},
	);
	await Promise.all(workers);
	return results;
}

export async function fetchHackerNewsIngestionSnapshot(
	options: ClientOptions = {},
): Promise<HackerNewsIngestionSnapshot> {
	const perFeedLimit = options.perFeedLimit ?? HACKER_NEWS_PER_FEED_LIMIT;
	if (!Number.isInteger(perFeedLimit) || perFeedLimit < 1) {
		throw new Error("Hacker News per-feed limit must be a positive integer");
	}

	const feedResults = await Promise.all(
		FEEDS.map(async (feed) => ({
			feed,
			ids: normalizeHackerNewsStoryIds(
				await fetchJson(`/${feed}stories.json`, options),
			).slice(0, perFeedLimit),
		})),
	);

	const ranksByStoryId = new Map<number, HackerNewsFeedRanks>();
	const feedIdCounts = {
		[HackerNewsFeedKey.Top]: 0,
		[HackerNewsFeedKey.New]: 0,
		[HackerNewsFeedKey.Best]: 0,
	};
	for (const { feed, ids } of feedResults) {
		feedIdCounts[feed] = ids.length;
		ids.forEach((storyId, index) => {
			addRank(ranksByStoryId, feed, storyId, index + 1);
		});
	}

	const selectedIds = [...ranksByStoryId.keys()];
	const fetchedItems = await mapWithConcurrency(
		selectedIds,
		options.concurrency ?? HACKER_NEWS_FETCH_CONCURRENCY,
		async (storyId) => {
			const payload = (await fetchJson(
				`/item/${storyId}.json`,
				options,
			)) as HackerNewsItemResponse | null;
			return normalizeHackerNewsStoryForIngestion(payload);
		},
	);

	const stories: HackerNewsFetchedStory[] = [];
	for (let index = 0; index < selectedIds.length; index += 1) {
		const story = fetchedItems[index];
		const storyId = selectedIds[index];
		if (!story || storyId === undefined) continue;

		const ranks = ranksByStoryId.get(storyId);
		if (ranks) stories.push({ story, ranks });
	}

	return {
		feedIdCounts,
		uniqueSelectedCount: selectedIds.length,
		fetchedCount: selectedIds.length,
		skippedCount: selectedIds.length - stories.length,
		stories,
	};
}
