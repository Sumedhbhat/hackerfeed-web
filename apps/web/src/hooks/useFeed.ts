import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	feedStoryIdsQueryOptions,
	type HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

export enum FeedStatus {
	Empty = "empty",
	Ready = "ready",
}

export type UseFeedReturn = {
	/** The loaded stories, or `undefined` while the first page loads. */
	stories: HackerNewsStoryRecord[] | undefined;
	isPending: boolean;
	displayedIds: number[];
	nextBatchIds: number[];
	hasMore: boolean;
	nextBatchSize: number;
	activeStatus: FeedStatus;
	loadMore: () => void;
	refetch: () => void;
};

export function useFeed(feed: HackerNewsFeedKey): UseFeedReturn {
	const [loadedCount, setLoadedCount] = useState(PAGE_SIZE);

	const idsQuery = useQuery({
		...feedStoryIdsQueryOptions(feed),
		throwOnError: true,
	});
	const allIds = idsQuery.data ?? [];
	const displayedIds = allIds.slice(0, loadedCount);
	const hasMore = allIds.length > loadedCount;
	const nextBatchSize = Math.min(allIds.length - loadedCount, PAGE_SIZE);
	const nextBatchIds = allIds.slice(loadedCount, loadedCount + PAGE_SIZE);

	const storyQueries = useQueries({
		queries: displayedIds.map((id) => ({
			...storyQueryOptions(id),
			throwOnError: true,
		})),
	});

	const firstPageLoading =
		idsQuery.isPending ||
		storyQueries.slice(0, PAGE_SIZE).some((query) => query.isPending);
	const stories = firstPageLoading
		? undefined
		: storyQueries.flatMap((query) => (query.data ? [query.data] : []));

	return {
		stories,
		isPending:
			!firstPageLoading && storyQueries.some((query) => query.isPending),
		displayedIds,
		nextBatchIds,
		hasMore,
		nextBatchSize,
		activeStatus:
			idsQuery.data?.length === 0 ? FeedStatus.Empty : FeedStatus.Ready,
		loadMore: () => setLoadedCount((prev) => prev + PAGE_SIZE),
		refetch: () => void idsQuery.refetch(),
	};
}
