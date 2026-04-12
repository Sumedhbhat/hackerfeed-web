import { createFileRoute } from "@tanstack/react-router";
import { StoryCard, StoryCardSkeleton } from "#/components/StoryCard";
import { useFeed } from "#/hooks/useFeed";
import {
	feedStoryIdsQueryOptions,
	HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

const SKELETON_KEYS = Array.from(
	{ length: PAGE_SIZE },
	(_, i) => `skeleton-${i}`,
);

export const Route = createFileRoute("/")({
	component: App,
	loader: async ({ context }) => {
		const ids = await context.queryClient.ensureQueryData(
			feedStoryIdsQueryOptions(HackerNewsFeedKey.Top),
		);
		await Promise.all(
			ids
				.slice(0, PAGE_SIZE)
				.map((id) =>
					context.queryClient.ensureQueryData(storyQueryOptions(id)),
				),
		);
	},
});

const feedTabs: Array<{
	key: HackerNewsFeedKey;
	label: string;
	title: string;
}> = [
	{ key: HackerNewsFeedKey.Top, label: "Top", title: "Top stories" },
	{ key: HackerNewsFeedKey.New, label: "New", title: "New stories" },
	{ key: HackerNewsFeedKey.Best, label: "Best", title: "Best stories" },
];

export function App() {
	const {
		activeFeed,
		setActiveFeed,
		displayedIds,
		storyQueries,
		committedCount,
		allDisplayedSettled,
		isAnyStoryLoading,
		hasMore,
		nextBatchSize,
		activeStatus,
		loadMore,
		refetch,
	} = useFeed(HackerNewsFeedKey.Top);

	const activeFeedMeta =
		feedTabs.find((feed) => feed.key === activeFeed) ?? feedTabs[0];

	return (
		<main className="page-wrap px-4 pb-10 pt-5 sm:pt-10 sm:pb-14">
			<div className="space-y-6">
				{/* Feed tabs — editorial underline style */}
				<div className="flex items-center gap-6 border-b border-(--line)">
					{feedTabs.map((feed) => {
						const isActive = activeFeed === feed.key;
						return (
							<button
								key={feed.key}
								type="button"
								onClick={() => setActiveFeed(feed.key)}
								aria-pressed={isActive}
								className={`relative pb-3 text-sm font-medium transition-colors ${
									isActive
										? "text-(--sea-ink)"
										: "text-(--sea-ink-soft) hover:text-(--sea-ink)"
								}`}
							>
								{feed.label}
								{isActive ? (
									<span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-(--lagoon)" />
								) : null}
							</button>
						);
					})}
				</div>

				{/* Loading */}
				{activeStatus === "loading" ? (
					<div className="space-y-3">
						{SKELETON_KEYS.map((key, i) => (
							<StoryCardSkeleton key={key} index={i} />
						))}
					</div>
				) : null}

				{/* Ready */}
				{activeStatus === "ready" ? (
					<>
						<div className="space-y-3">
							{displayedIds.map((storyId, positionIndex) => {
								const query = storyQueries[positionIndex];

								// Items below committedCount were settled in a previous batch — always show as cards.
								// Items at or above committedCount are in the current loading batch:
								//   - show skeletons until the whole batch settles, then flip all at once.
								const inLoadingBatch = positionIndex >= committedCount;
								if (inLoadingBatch && !allDisplayedSettled) {
									return (
										<StoryCardSkeleton
											key={`${activeFeed}-${storyId}`}
											index={positionIndex}
										/>
									);
								}

								const story = query?.data;
								if (!story) return null;

								return (
									<StoryCard key={`${activeFeed}-${storyId}`} story={story} />
								);
							})}
						</div>

						{hasMore ? (
							<div className="flex justify-center pt-4">
								<button
									type="button"
									onClick={loadMore}
									disabled={isAnyStoryLoading}
									className="border border-(--chip-line) rounded px-5 py-2 text-sm font-medium text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft) disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
								>
									{isAnyStoryLoading
										? "Loading\u2026"
										: `Load ${nextBatchSize} more`}
								</button>
							</div>
						) : null}
					</>
				) : null}

				{/* Empty */}
				{activeStatus === "empty" ? (
					<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
						<p className="island-kicker mb-3">Nothing here yet</p>
						<h3 className="m-0 text-xl font-semibold tracking-tight text-(--sea-ink)">
							No {activeFeedMeta.label.toLowerCase()} stories found.
						</h3>
						<p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-(--sea-ink-soft)">
							The feed came back empty. A quick refresh should pick up new
							items.
						</p>
						<div className="mt-5">
							<button
								type="button"
								onClick={refetch}
								className="text-sm font-medium text-(--lagoon-deep) hover:text-(--lagoon) hover:underline underline-offset-2"
							>
								Refresh feed &rarr;
							</button>
						</div>
					</article>
				) : null}

				{/* Error */}
				{activeStatus === "error" ? (
					<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
						<p className="island-kicker mb-3">Feed unavailable</p>
						<h3 className="m-0 text-xl font-semibold tracking-tight text-(--sea-ink)">
							Couldn't load {activeFeedMeta.title.toLowerCase()}.
						</h3>
						<p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-(--sea-ink-soft)">
							The Hacker News request failed. Check your connection and try
							again.
						</p>
						<div className="mt-5 flex flex-wrap gap-4">
							<button
								type="button"
								onClick={refetch}
								className="text-sm font-medium text-(--lagoon-deep) hover:text-(--lagoon) hover:underline underline-offset-2"
							>
								Retry &rarr;
							</button>
							<a
								href="https://github.com/HackerNews/API"
								target="_blank"
								rel="noreferrer"
								className="text-sm text-(--sea-ink-soft) hover:text-(--sea-ink)"
							>
								API status
							</a>
						</div>
					</article>
				) : null}
			</div>
		</main>
	);
}
