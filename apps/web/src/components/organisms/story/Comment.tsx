import type { HackerNewsCommentRecord } from "@hackerfeed/hacker-news/records";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "@hackerfeed/ui/atoms/Collapsible";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { Prose } from "@hackerfeed/ui/atoms/Prose";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ThreadItem, ThreadList } from "@hackerfeed/ui/atoms/ThreadItem";
import { CommentSkeleton } from "@hackerfeed/ui/molecules/CommentSkeleton";
import { useSuspenseQueries } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { useComment } from "#/hooks/useComment";
import { commentQueryOptions } from "#/lib/hacker-news/queries";

type CommentProps = {
	comment: HackerNewsCommentRecord;
	depth?: number;
};

export function Comment({ comment, depth = 0 }: CommentProps) {
	const {
		collapsed,
		setCollapsed,
		repliesOpen,
		setRepliesOpen,
		age,
		replyCount,
	} = useComment(comment);

	if (comment.deleted && replyCount === 0) return null;

	const isGone = comment.deleted || comment.dead;

	return (
		<ThreadItem depth={depth}>
			<Collapsible
				open={!collapsed && !isGone}
				onOpenChange={(open) => setCollapsed(!open)}
			>
				<Stack gap="sm">
					{/* Header row: author + age + collapse toggle */}
					<Row gap="sm">
						{comment.deleted ? (
							<Text as="span" size="xs" tone="faint" italic>
								[deleted]
							</Text>
						) : comment.dead ? (
							<Text as="span" size="xs" tone="faint" italic>
								[dead]
							</Text>
						) : (
							<>
								<Text as="span" size="sm" weight="semibold">
									{comment.by ?? "unknown"}
								</Text>
								<Text as="span" size="xs" tone="faint">
									{age}
								</Text>
							</>
						)}

						{!isGone && (
							<Row as="span">
								<CollapsibleTrigger
									inline
									aria-label={`Comment by ${comment.by ?? "unknown"}`}
								>
									<Icon icon={collapsed ? ChevronRight : ChevronDown} />
								</CollapsibleTrigger>
							</Row>
						)}
					</Row>

					<CollapsiblePanel>
						<Stack gap="sm">
							{comment.text && <Prose html={comment.text} />}

							{replyCount > 0 && (
								<Collapsible open={repliesOpen} onOpenChange={setRepliesOpen}>
									<Stack gap="md">
										<Row>
											<CollapsibleTrigger flush>
												<Icon icon={repliesOpen ? ChevronDown : ChevronRight} />
												{repliesOpen
													? "Hide replies"
													: `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
											</CollapsibleTrigger>
										</Row>

										{/* Replies load inside this boundary, so the comment and its
										    "Hide replies" trigger stay mounted (and focused) meanwhile. */}
										<CollapsiblePanel>
											<Suspense
												fallback={
													<Stack gap="xs">
														{comment.kids.map((id) => (
															<CommentSkeleton key={id} />
														))}
													</Stack>
												}
											>
												{repliesOpen ? (
													<Replies ids={comment.kids} depth={depth + 1} />
												) : null}
											</Suspense>
										</CollapsiblePanel>
									</Stack>
								</Collapsible>
							)}
						</Stack>
					</CollapsiblePanel>
				</Stack>
			</Collapsible>
		</ThreadItem>
	);
}

/** A comment's replies; suspends while they load. */
function Replies({ ids, depth }: { ids: number[]; depth: number }) {
	const queries = useSuspenseQueries({
		queries: ids.map((id) => commentQueryOptions(id)),
	});
	return (
		<ThreadList>
			{queries.map((q) =>
				q.data ? (
					<Comment key={q.data.id} comment={q.data} depth={depth} />
				) : null,
			)}
		</ThreadList>
	);
}
