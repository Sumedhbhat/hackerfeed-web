import { Suspense } from "react";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/atoms/Collapsible";
import { Prose } from "#/components/atoms/Prose";
import { Row } from "#/components/atoms/Row";
import { Stack } from "#/components/atoms/Stack";
import { Text } from "#/components/atoms/Text";
import { ThreadItem } from "#/components/atoms/ThreadItem";
import { CommentSkeleton } from "#/components/molecules/CommentSkeleton";
import { useComment } from "#/hooks/useComment";
import type { HackerNewsCommentRecord } from "#/lib/hacker-news/queries";

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
		childQueries,
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
								<Text as="span" size="xs" weight="semibold">
									{comment.by ?? "unknown"}
								</Text>
								<Text as="span" size="xs" tone="faint">
									{age}
								</Text>
							</>
						)}

						{!isGone && (
							<Row as="span" pushEnd>
								<CollapsibleTrigger
									aria-label={`Comment by ${comment.by ?? "unknown"}`}
								>
									{collapsed ? "[+]" : "[-]"}
								</CollapsibleTrigger>
							</Row>
						)}
					</Row>

					<CollapsiblePanel>
						<Stack gap="md">
							{comment.text && <Prose html={comment.text} />}

							{replyCount > 0 && (
								<Collapsible open={repliesOpen} onOpenChange={setRepliesOpen}>
									<Stack gap="md">
										<Row>
											<CollapsibleTrigger>
												{repliesOpen
													? "Hide replies"
													: `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
											</CollapsibleTrigger>
										</Row>

										{/* Nested replies — wrapped in Suspense so parent comment isn't affected while loading */}
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
												<Stack gap="none">
													{childQueries.map((q) => {
														if (!q.data) return null;
														return (
															<Comment
																key={q.data.id}
																comment={q.data}
																depth={depth + 1}
															/>
														);
													})}
												</Stack>
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
