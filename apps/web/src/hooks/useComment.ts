import type { HackerNewsCommentRecord } from "@hackerfeed/hacker-news/records";
import { formatStoryAge } from "@hackerfeed/hacker-news/utils";
import { useState } from "react";

export type UseCommentReturn = {
	collapsed: boolean;
	setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
	repliesOpen: boolean;
	setRepliesOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
	age: string;
	replyCount: number;
};

/** A comment's local state. Its replies load in `Replies`, inside their own Suspense boundary. */
export function useComment(comment: HackerNewsCommentRecord): UseCommentReturn {
	const [collapsed, setCollapsed] = useState(false);
	const [repliesOpen, setRepliesOpen] = useState(false);

	return {
		collapsed,
		setCollapsed,
		repliesOpen,
		setRepliesOpen,
		age: formatStoryAge(comment.time),
		replyCount: comment.kids.length,
	};
}
