import { useSuspenseQueries } from "@tanstack/react-query";
import { useState } from "react";
import {
	commentQueryOptions,
	type HackerNewsCommentRecord,
} from "#/lib/hacker-news/queries";
import { formatStoryAge } from "#/lib/hacker-news/utils";

export type UseCommentReturn = {
	collapsed: boolean;
	setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
	repliesOpen: boolean;
	setRepliesOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
	childQueries: ReturnType<
		typeof useSuspenseQueries<ReturnType<typeof commentQueryOptions>[]>
	>;
	age: string;
	replyCount: number;
};

export function useComment(comment: HackerNewsCommentRecord): UseCommentReturn {
	const [collapsed, setCollapsed] = useState(false);
	const [repliesOpen, setRepliesOpen] = useState(false);

	const childQueries = useSuspenseQueries({
		queries: repliesOpen
			? comment.kids.map((id) => commentQueryOptions(id))
			: [],
	});

	const age = formatStoryAge(comment.time);
	const replyCount = comment.kids.length;

	return {
		collapsed,
		setCollapsed,
		repliesOpen,
		setRepliesOpen,
		childQueries,
		age,
		replyCount,
	};
}
