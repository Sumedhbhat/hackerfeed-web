import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useTransition } from "react";
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
	isPending: boolean;
	displayedIds: number[];
	nextBatchIds: number[];
	storyQueries: ReturnType<
		typeof useSuspenseQueries<ReturnType<typeof storyQueryOptions>[]>
	>;
	hasMore: boolean;
	nextBatchSize: number;
	activeStatus: FeedStatus;
	loadMore: () => void;
	refetch: () => void;
};

export function useFeed(feed: HackerNewsFeedKey): UseFeedReturn {
	const [loadedCount, setLoadedCount] = useState(PAGE_SIZE);
	const [isPending, startTransition] = useTransition();

	const idsQuery = useSuspenseQuery(feedStoryIdsQueryOptions(feed));
	const allIds = idsQuery.data ?? [];
	const displayedIds = allIds.slice(0, loadedCount);
	const hasMore = allIds.length > loadedCount;
	const nextBatchSize = Math.min(allIds.length - loadedCount, PAGE_SIZE);
	const nextBatchIds = allIds.slice(loadedCount, loadedCount + PAGE_SIZE);

	const storyQueries = useSuspenseQueries({
		queries: displayedIds.map((id) => storyQueryOptions(id)),
	});

	const activeStatus: FeedStatus =
		allIds.length === 0 ? FeedStatus.Empty : FeedStatus.Ready;

	const loadMore = () => {
		startTransition(() => {
			setLoadedCount((prev) => prev + PAGE_SIZE);
		});
	};

	const refetch = () => {
		idsQuery.refetch();
	};

	return {
		isPending,
		displayedIds,
		nextBatchIds,
		storyQueries,
		hasMore,
		nextBatchSize,
		activeStatus,
		loadMore,
		refetch,
	};
}
