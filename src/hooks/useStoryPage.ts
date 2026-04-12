import { useQueries, useQuery } from "@tanstack/react-query";
import {
	commentQueryOptions,
	type HackerNewsStoryRecord,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

export type UseStoryPageReturn = {
	story: HackerNewsStoryRecord | null | undefined;
	commentQueries: ReturnType<
		typeof useQueries<ReturnType<typeof commentQueryOptions>[]>
	>;
	allLoaded: boolean;
};

export function useStoryPage(storyId: number): UseStoryPageReturn {
	const { data: story } = useQuery(storyQueryOptions(storyId));

	const commentQueries = useQueries({
		queries: (story?.kids ?? []).map((id) => commentQueryOptions(id)),
	});

	const allLoaded = commentQueries.every((q) => !q.isPending);

	return { story, commentQueries, allLoaded };
}
