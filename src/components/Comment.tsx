import { Suspense } from "react";
import { useComment } from "#/hooks/useComment";
import type { HackerNewsCommentRecord } from "#/lib/hacker-news/queries";

// ---------------------------------------------------------------------------
// Comment skeleton
// ---------------------------------------------------------------------------

export function CommentSkeleton() {
	return (
		<div className="animate-pulse py-4 space-y-2">
			<div className="h-2.5 w-28 rounded-sm bg-(--sand) opacity-60" />
			<div className="h-3 w-4/5 rounded-sm bg-(--sand) opacity-40" />
			<div className="h-3 w-3/5 rounded-sm bg-(--sand) opacity-30" />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------

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
		borderClass,
	} = useComment(comment, depth);

	if (comment.deleted && replyCount === 0) return null;

	return (
		<div className={`${borderClass} py-3`}>
			{/* Header row: author + age + collapse toggle */}
			<div className="flex items-center gap-2 mb-2">
				{comment.deleted ? (
					<span className="text-xs italic text-(--sea-ink-soft) opacity-50">
						[deleted]
					</span>
				) : comment.dead ? (
					<span className="text-xs italic text-(--sea-ink-soft) opacity-50">
						[dead]
					</span>
				) : (
					<>
						<span className="text-xs font-semibold text-(--sea-ink)">
							{comment.by ?? "unknown"}
						</span>
						<span className="text-xs text-(--sea-ink-soft) opacity-60">
							{age}
						</span>
					</>
				)}

				{!comment.deleted && !comment.dead && (
					<button
						type="button"
						onClick={() => setCollapsed((v) => !v)}
						className="ml-auto text-xs text-(--sea-ink-soft) opacity-50 hover:opacity-100 transition-opacity"
						aria-label={collapsed ? "Expand comment" : "Collapse comment"}
					>
						{collapsed ? "[+]" : "[\u2013]"}
					</button>
				)}
			</div>

			{!collapsed && !comment.deleted && !comment.dead && (
				<>
					{/* Comment HTML body */}
					{comment.text && (
						<div
							className="prose prose-sm max-w-none mb-3 text-(--sea-ink-soft) prose-a:text-(--lagoon-deep) prose-a:no-underline hover:prose-a:underline prose-pre:bg-(--sand) prose-code:text-(--sea-ink) prose-p:my-1.5"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: HN API returns trusted HTML
							dangerouslySetInnerHTML={{ __html: comment.text }}
						/>
					)}

					{/* Replies toggle */}
					{replyCount > 0 && (
						<button
							type="button"
							onClick={() => setRepliesOpen((v) => !v)}
							className="text-xs text-(--sea-ink-soft) hover:text-(--sea-ink) transition-colors"
						>
							{repliesOpen
								? "Hide replies"
								: `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
						</button>
					)}

					{/* Nested replies — wrapped in Suspense so parent comment isn't affected while loading */}
					{repliesOpen && (
						<Suspense
							fallback={
								<div className="space-y-1">
									{comment.kids.map((id) => (
										<CommentSkeleton key={id} />
									))}
								</div>
							}
						>
							<div className="mt-3 space-y-0">
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
							</div>
						</Suspense>
					)}
				</>
			)}
		</div>
	);
}
