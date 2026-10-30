import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import {
	commentQueryOptions,
	type HackerNewsStoryRecord,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

export type UseStoryPageReturn = {
	story: HackerNewsStoryRecord | null;
	commentQueries: ReturnType<
		typeof useSuspenseQueries<ReturnType<typeof commentQueryOptions>[]>
	>;
};

export function useStoryPage(storyId: number): UseStoryPageReturn {
	const { data: story } = useSuspenseQuery(storyQueryOptions(storyId));

	const commentQueries = useSuspenseQueries({
		queries: (story?.kids ?? []).map((id) => commentQueryOptions(id)),
	});

	return { story, commentQueries };
}
