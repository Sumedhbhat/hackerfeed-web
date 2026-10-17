import { Suspense } from "react";
import { Button } from "#/components/atoms/Button";
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
							<Button
								variant="ghost"
								onClick={() => setCollapsed((v) => !v)}
								aria-label={collapsed ? "Expand comment" : "Collapse comment"}
							>
								{collapsed ? "[+]" : "[-]"}
							</Button>
						</Row>
					)}
				</Row>

				{!collapsed && !isGone && (
					<Stack gap="md">
						{comment.text && <Prose html={comment.text} />}

						{replyCount > 0 && (
							<Row>
								<Button
									variant="ghost"
									onClick={() => setRepliesOpen((v) => !v)}
								>
									{repliesOpen
										? "Hide replies"
										: `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
								</Button>
							</Row>
						)}

						{/* Nested replies — wrapped in Suspense so parent comment isn't affected while loading */}
						{repliesOpen && (
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
						)}
					</Stack>
				)}
			</Stack>
		</ThreadItem>
	);
}
