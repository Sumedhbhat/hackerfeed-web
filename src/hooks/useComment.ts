import { useSuspenseQueries } from "@tanstack/react-query";
import { useState } from "react";
import {
	commentQueryOptions,
	type HackerNewsCommentRecord,
} from "#/lib/hacker-news/queries";
import { formatStoryAge } from "#/lib/hacker-news/utils";

const DEPTH_BORDERS = [
	"",
	"border-l-2 pl-4 border-(--lagoon)/60",
	"border-l-2 pl-4 border-(--lagoon)/40",
	"border-l-2 pl-4 border-(--lagoon)/25",
	"border-l-2 pl-4 border-(--lagoon)/15",
];

export function depthBorder(depth: number): string {
	return DEPTH_BORDERS[Math.min(depth, DEPTH_BORDERS.length - 1)] ?? "";
}

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
	borderClass: string;
};

export function useComment(
	comment: HackerNewsCommentRecord,
	depth: number,
): UseCommentReturn {
	const [collapsed, setCollapsed] = useState(false);
	const [repliesOpen, setRepliesOpen] = useState(false);

	const childQueries = useSuspenseQueries({
		queries: repliesOpen
			? comment.kids.map((id) => commentQueryOptions(id))
			: [],
	});

	const age = formatStoryAge(comment.time);
	const replyCount = comment.kids.length;
	const borderClass = depthBorder(depth);

	return {
		collapsed,
		setCollapsed,
		repliesOpen,
		setRepliesOpen,
		childQueries,
		age,
		replyCount,
		borderClass,
	};
}
