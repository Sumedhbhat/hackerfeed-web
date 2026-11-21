import { useQueries } from "@tanstack/react-query";
import { PAGE_SIZE } from "#/lib/hacker-news/queries";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

export const STORIES_LAST_VIEWED_KEY = ["views", "stories-last-viewed"];

/** When the signed-in reader last opened each of these stories, asked a page at a time. */
export function useStoriesLastViewed(hnStoryIds: number[]): Map<number, Date> {
	const { user } = useAuthSession();
	const pages: number[][] = [];
	for (let start = 0; start < hnStoryIds.length; start += PAGE_SIZE) {
		pages.push(hnStoryIds.slice(start, start + PAGE_SIZE));
	}

	return useQueries({
		queries: pages.map((page) => ({
			queryKey: [...STORIES_LAST_VIEWED_KEY, user?.id, page],
			queryFn: () =>
				createTrpcClient().views.storiesLastViewed.query({ hnStoryIds: page }),
			enabled: Boolean(user),
			staleTime: 60_000,
			meta: { notifyOnError: false },
		})),
		combine: (results) =>
			new Map(
				results.flatMap((result) =>
					(result.data ?? []).map(
						({ hnStoryId, lastViewedAt }) => [hnStoryId, lastViewedAt] as const,
					),
				),
			),
	});
}
