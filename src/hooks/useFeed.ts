import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	feedStoryIdsQueryOptions,
	HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

export type FeedStatus = "loading" | "error" | "empty" | "ready";

export type UseFeedReturn = {
	activeFeed: HackerNewsFeedKey;
	setActiveFeed: (feed: HackerNewsFeedKey) => void;
	displayedIds: number[];
	storyQueries: ReturnType<
		typeof useQueries<ReturnType<typeof storyQueryOptions>[]>
	>;
	committedCount: number;
	allDisplayedSettled: boolean;
	isAnyStoryLoading: boolean;
	hasMore: boolean;
	nextBatchSize: number;
	activeStatus: FeedStatus;
	loadMore: () => void;
	refetch: () => void;
};

export function useFeed(
	initialFeed: HackerNewsFeedKey = HackerNewsFeedKey.Top,
): UseFeedReturn {
	const [activeFeed, setActiveFeed] = useState<HackerNewsFeedKey>(initialFeed);
	const [loadedCounts, setLoadedCounts] = useState<
		Record<HackerNewsFeedKey, number>
	>({ top: PAGE_SIZE, new: PAGE_SIZE, best: PAGE_SIZE });
	const [committedCounts, setCommittedCounts] = useState<
		Record<HackerNewsFeedKey, number>
	>({ top: 0, new: 0, best: 0 });

	const committedCount = committedCounts[activeFeed];
	const loadedCount = loadedCounts[activeFeed];

	const idsQuery = useQuery(feedStoryIdsQueryOptions(activeFeed));
	const allIds = idsQuery.data ?? [];
	const displayedIds = allIds.slice(0, loadedCount);
	const hasMore = allIds.length > loadedCount;
	const nextBatchSize = Math.min(allIds.length - loadedCount, PAGE_SIZE);

	const storyQueries = useQueries({
		queries: displayedIds.map((id) => storyQueryOptions(id)),
	});

	const isAnyStoryLoading = storyQueries.some((q) => q.isPending);
	const allDisplayedSettled =
		storyQueries.length > 0 && storyQueries.every((q) => !q.isPending);

	useEffect(() => {
		if (allDisplayedSettled && displayedIds.length > 0) {
			setCommittedCounts((prev) => ({
				...prev,
				[activeFeed]: displayedIds.length,
			}));
		}
	}, [allDisplayedSettled, displayedIds.length, activeFeed]);

	const activeStatus: FeedStatus = idsQuery.isPending
		? "loading"
		: idsQuery.isError
			? "error"
			: allIds.length === 0
				? "empty"
				: "ready";

	const loadMore = () => {
		setLoadedCounts((prev) => ({
			...prev,
			[activeFeed]: prev[activeFeed] + PAGE_SIZE,
		}));
	};

	const refetch = () => {
		idsQuery.refetch();
	};

	return {
		activeFeed,
		setActiveFeed,
		displayedIds,
		storyQueries,
		committedCount,
		allDisplayedSettled,
		isAnyStoryLoading,
		hasMore,
		nextBatchSize,
		activeStatus,
		loadMore,
		refetch,
	};
}
