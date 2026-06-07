import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { Comment } from "#/components/comment";
import { useStoryPage } from "#/hooks/useStoryPage";
import {
	commentQueryOptions,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
} from "#/lib/hacker-news/utils";
import { logger } from "#/lib/logger";

export const Route = createFileRoute("/story/$storyId")({
	params: {
		parse: (raw) => ({ storyId: Number(raw.storyId) }),
		stringify: (params) => ({ storyId: String(params.storyId) }),
	},
	loader: async ({ context, params }) => {
		const { storyId } = params;

		try {
			const story = await context.queryClient.ensureQueryData(
				storyQueryOptions(storyId),
			);

			if (!story) throw notFound();

			// Warm top-level comments in parallel; don't let one failure block the page
			await Promise.allSettled(
				story.kids.map((id) =>
					context.queryClient.ensureQueryData(commentQueryOptions(id)),
				),
			);

			return story;
		} catch (err) {
			// notFound() errors are expected — don't log them as errors
			const isNotFound =
				err != null &&
				typeof err === "object" &&
				"isNotFound" in err &&
				err.isNotFound === true;

			if (!isNotFound) {
				logger.error("Story loader failed", {
					storyId,
					err: err instanceof Error ? err.message : String(err),
					stack: err instanceof Error ? err.stack : undefined,
				});
			}

			throw err;
		}
	},
	component: StoryPage,
	errorComponent: StoryError,
	notFoundComponent: () => (
		<main className="page-wrap px-4 pt-10 pb-14">
			<p className="island-kicker mb-3">Not found</p>
			<h1 className="m-0 mb-4 text-2xl font-semibold text-(--sea-ink)">
				Story not found.
			</h1>
			<Link
				to="/"
				className="text-sm font-medium text-(--lagoon-deep) hover:text-(--lagoon) hover:underline underline-offset-2"
			>
				<ArrowLeft size={14} aria-hidden="true" /> Back to feed
			</Link>
		</main>
	),
});

// ---------------------------------------------------------------------------
// StoryError — ErrorBoundary fallback
// ---------------------------------------------------------------------------

function StoryError() {
	return (
		<main className="page-wrap px-4 pt-6 pb-16 sm:pt-10">
			<Link
				to="/"
				className="inline-block mb-6 text-sm text-(--sea-ink-soft) hover:text-(--sea-ink) transition-colors"
			>
				<ArrowLeft size={14} aria-hidden="true" /> Feed
			</Link>
			<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
				<p className="island-kicker mb-3">Story unavailable</p>
				<h1 className="m-0 text-xl font-semibold tracking-tight text-(--sea-ink)">
					Couldn&apos;t load this story.
				</h1>
				<p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-(--sea-ink-soft)">
					The Hacker News request failed. Check your connection and try again.
				</p>
			</article>
		</main>
	);
}

// ---------------------------------------------------------------------------
// StoryContentSkeleton — Suspense fallback
// ---------------------------------------------------------------------------

function StoryContentSkeleton() {
	return (
		<main className="page-wrap px-4 pt-6 pb-16 sm:pt-10 animate-pulse">
			<div className="inline-block mb-6 h-4 w-12 rounded bg-(--sand) opacity-60" />
			<div className="island-shell rounded-lg p-5 sm:p-7 mb-8">
				<div className="h-2.5 w-24 rounded-sm bg-(--sand) opacity-40 mb-3" />
				<div className="h-6 w-3/4 rounded bg-(--sand) opacity-50 mb-4" />
				<div className="h-3 w-32 rounded-sm bg-(--sand) opacity-30 mb-5" />
				<div className="flex gap-4">
					<div className="h-4 w-24 rounded bg-(--sand) opacity-40" />
					<div className="h-4 w-20 rounded bg-(--sand) opacity-30" />
				</div>
			</div>
		</main>
	);
}

// ---------------------------------------------------------------------------
// StoryContent — inner component that calls useSuspenseQuery hooks
// ---------------------------------------------------------------------------

type StoryContentProps = {
	storyId: number;
};

function StoryContent({ storyId }: StoryContentProps) {
	const { story, commentQueries } = useStoryPage(storyId);

	if (!story) return null;

	const age = formatStoryAge(story.time);
	const domain = getStoryDomain(story.url);
	const title = getStoryTitle(story);

	return (
		<main className="page-wrap px-4 pt-6 pb-16 sm:pt-10">
			{/* Back navigation */}
			<Link
				to="/"
				className="inline-block mb-6 text-sm text-(--sea-ink-soft) hover:text-(--sea-ink) transition-colors"
			>
				<ArrowLeft size={14} aria-hidden="true" /> Feed
			</Link>

			{/* Story header */}
			<article className="island-shell rounded-lg p-5 sm:p-7 mb-8 rise-in">
				{/* Kicker row */}
				<div className="flex flex-wrap gap-1.5 items-center mb-3 font-semibold uppercase text-[0.65rem] tracking-[0.12em] text-(--kicker)">
					{domain ? <span>{domain}</span> : null}
					{domain ? <span className="opacity-40">/</span> : null}
					<span className="opacity-70">{age}</span>
				</div>

				{/* Title */}
				<h1 className="m-0 mb-4 text-xl sm:text-2xl font-semibold leading-snug text-(--sea-ink)">
					{title}
				</h1>

				{/* Story body text (Ask HN / Show HN posts) */}
				{story.text && (
					<div
						className="prose prose-sm max-w-none mb-4 text-(--sea-ink-soft) prose-a:text-(--lagoon-deep) prose-a:no-underline hover:prose-a:underline prose-pre:bg-(--sand) prose-code:text-(--sea-ink) prose-p:my-1.5"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: HN API returns trusted HTML
						dangerouslySetInnerHTML={{ __html: story.text }}
					/>
				)}

				{/* Meta */}
				<p className="m-0 mb-5 text-xs opacity-70 text-(--sea-ink-soft)">
					{story.score} pts
					{story.by ? <> &middot; {story.by}</> : null}
					{story.descendants != null ? (
						<> &middot; {story.descendants} comments</>
					) : null}
				</p>

				{/* Actions */}
				<div className="flex flex-wrap gap-4">
					{story.url && (
						<a
							href={story.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-medium text-(--lagoon-deep) hover:text-(--lagoon) hover:underline underline-offset-2"
						>
							Read article{" "}
							<ArrowRight
								size={14}
								aria-hidden="true"
								className="inline opacity-60"
							/>
						</a>
					)}
					<a
						href={getDiscussionUrl(story.id)}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-(--sea-ink-soft) hover:text-(--sea-ink) transition-colors"
					>
						View on HN
					</a>
				</div>
			</article>

			{/* Comments section */}
			<section>
				<h2 className="m-0 mb-6 text-base font-semibold text-(--sea-ink)">
					{story.descendants != null
						? `${story.descendants} comments`
						: "Discussion"}
				</h2>

				{story.kids.length === 0 ? (
					<p className="text-sm text-(--sea-ink-soft)">No comments yet.</p>
				) : (
					<div className="space-y-1 divide-y divide-(--line)">
						{commentQueries.map((q) => {
							if (!q.data) return null;
							return <Comment key={q.data.id} comment={q.data} depth={0} />;
						})}
					</div>
				)}
			</section>
		</main>
	);
}

// ---------------------------------------------------------------------------
// StoryPage — route component
// ---------------------------------------------------------------------------

function StoryPage() {
	const { storyId } = Route.useParams();

	return (
		<Suspense fallback={<StoryContentSkeleton />}>
			<StoryContent storyId={storyId} />
		</Suspense>
	);
}
