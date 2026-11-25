import { fake, usePlaceholder } from "@autoskeleton/react";
import type {
	HackerNewsCommentRecord,
	HackerNewsStoryRecord,
} from "@hackerfeed/entities/hacker-news";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
	commentQueryOptions,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

type StoryPageData = {
	story: HackerNewsStoryRecord | null;
	comments: HackerNewsCommentRecord[];
};

const COMMENT_LENGTHS = [18, 40, 26];

const PLACEHOLDER_COMMENTS: HackerNewsCommentRecord[] = fake.list(3, (i) => ({
	id: fake.id(i, "number"),
	by: fake.text(8, i),
	text: fake.sentence(COMMENT_LENGTHS[i], i),
	time: null,
	kids: [],
	parent: 0,
	type: "comment",
	deleted: false,
	dead: false,
}));

const STORY_PAGE_PLACEHOLDER: StoryPageData = {
	story: {
		id: fake.id(0, "number"),
		by: fake.text(8),
		descendants: 88,
		kids: PLACEHOLDER_COMMENTS.map((comment) => comment.id),
		score: 888,
		text: null,
		time: null,
		title: fake.sentence(9),
		type: "story",
		url: "https://example.com/",
	},
	comments: PLACEHOLDER_COMMENTS,
};

export type UseStoryPageReturn = StoryPageData & { loading: boolean };

export function useStoryPage(storyId: number): UseStoryPageReturn {
	const { data: story } = useQuery({
		...storyQueryOptions(storyId),
		throwOnError: true,
	});

	const comments = useQueries({
		queries: (story?.kids ?? []).map((id) => ({
			...commentQueryOptions(id),
			throwOnError: true,
		})),
		combine: (results) =>
			results.some((result) => result.isPending)
				? undefined
				: results.flatMap((result) => (result.data ? [result.data] : [])),
	});

	const { data, loading } = usePlaceholder(
		story !== undefined && comments !== undefined
			? { story, comments }
			: undefined,
		STORY_PAGE_PLACEHOLDER,
	);
	return { ...data, loading };
}
