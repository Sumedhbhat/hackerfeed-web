import { fake, Skeleton, usePlaceholder } from "@autoskeleton/react";
import type { HackerNewsCommentRecord } from "@hackerfeed/entities/hacker-news";
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
import { useQueries } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useComment } from "#/hooks/useComment";
import { commentQueryOptions } from "#/lib/hacker-news/queries";

const REPLY_LENGTHS = [8, 24, 14];

function replyPlaceholder(parent: number, i: number): HackerNewsCommentRecord {
	return {
		id: fake.id(i, "number"),
		by: fake.text(8, i),
		text: fake.sentence(REPLY_LENGTHS[i % REPLY_LENGTHS.length], i),
		time: null,
		kids: [],
		parent,
		type: "comment",
		deleted: false,
		dead: false,
	};
}

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
					<Row gap="sm" wrap>
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

										<CollapsiblePanel>
											{repliesOpen ? (
												<Replies
													parent={comment.id}
													ids={comment.kids}
													depth={depth + 1}
												/>
											) : null}
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

function Replies({
	parent,
	ids,
	depth,
}: {
	parent: number;
	ids: number[];
	depth: number;
}) {
	const replies = useQueries({
		queries: ids.map((id) => ({
			...commentQueryOptions(id),
			throwOnError: true,
		})),
		combine: (results) =>
			results.some((result) => result.isPending)
				? undefined
				: results.flatMap((result) => (result.data ? [result.data] : [])),
	});
	const { data, loading } = usePlaceholder(replies, () =>
		ids.map((_, i) => replyPlaceholder(parent, i)),
	);
	return (
		<Skeleton loading={loading}>
			<ThreadList>
				{data.map((reply) => (
					<Comment key={reply.id} comment={reply} depth={depth} />
				))}
			</ThreadList>
		</Skeleton>
	);
}
