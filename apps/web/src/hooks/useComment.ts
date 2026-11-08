import type { HackerNewsCommentRecord } from "@hackerfeed/hacker-news/records";
import { formatStoryAge } from "@hackerfeed/hacker-news/utils";
import { useEffect, useRef, useState } from "react";
import { useThreadExpansion } from "./useThreadExpansion";

export type UseCommentReturn = {
	collapsed: boolean;
	setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
	repliesOpen: boolean;
	setRepliesOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
	age: string;
	replyCount: number;
};

export function useComment(comment: HackerNewsCommentRecord): UseCommentReturn {
	const expansion = useThreadExpansion();
	const [collapsed, setCollapsed] = useState(false);
	// Replies that load after "Expand all" open too.
	const [repliesOpen, setRepliesOpen] = useState(expansion.mode === "expand");

	// Compare `revision`, not `mode`, so pressing the same button twice applies.
	const appliedRef = useRef(expansion.revision);
	useEffect(() => {
		if (expansion.revision === appliedRef.current) return;
		appliedRef.current = expansion.revision;
		setRepliesOpen(expansion.mode === "expand");
		if (expansion.mode === "expand") setCollapsed(false);
	}, [expansion]);

	return {
		collapsed,
		setCollapsed,
		repliesOpen,
		setRepliesOpen,
		age: formatStoryAge(comment.time),
		replyCount: comment.kids.length,
	};
}
