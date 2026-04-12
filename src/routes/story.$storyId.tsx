import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Comment, CommentSkeleton } from "#/components/Comment";
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

export const Route = createFileRoute("/story/$storyId")({
	params: {
		parse: (raw) => ({ storyId: Number(raw.storyId) }),
		stringify: (params) => ({ storyId: String(params.storyId) }),
	},
	loader: async ({ context, params }) => {
		const { storyId } = params;

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
	},
	component: StoryPage,
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
				&larr; Back to feed
			</Link>
		</main>
	),
});

function StoryPage() {
	const { storyId } = Route.useParams();
	const { data: story } = useQuery(storyQueryOptions(storyId));

	const commentQueries = useQueries({
		queries: (story?.kids ?? []).map((id) => commentQueryOptions(id)),
	});

	if (!story) return null;

	const age = formatStoryAge(story.time);
	const domain = getStoryDomain(story.url);
	const title = getStoryTitle(story);
	const allLoaded = commentQueries.every((q) => !q.isPending);

	return (
		<main className="page-wrap px-4 pt-6 pb-16 sm:pt-10">
			{/* Back navigation */}
			<Link
				to="/"
				className="inline-block mb-6 text-sm text-(--sea-ink-soft) hover:text-(--sea-ink) transition-colors"
			>
				&larr; Feed
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
							<span aria-hidden="true" className="opacity-60">
								&rarr;
							</span>
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
						{!allLoaded && story.kids.map((id) => <CommentSkeleton key={id} />)}
						{allLoaded &&
							commentQueries.map((q) => {
								if (!q.data) return null;
								return <Comment key={q.data.id} comment={q.data} depth={0} />;
							})}
					</div>
				)}
			</section>
		</main>
	);
}
