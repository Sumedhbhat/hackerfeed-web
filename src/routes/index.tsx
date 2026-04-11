import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoryCard, StoryCardSkeleton } from "#/components/StoryCard";
import {
	feedStoryIdsQueryOptions,
	type HackerNewsFeedKey,
	PAGE_SIZE,
	storyItemQueryOptions,
} from "#/lib/hacker-news/queries";

const SKELETON_KEYS = Array.from({ length: PAGE_SIZE }, (_, i) => `skeleton-${i}`);

export const Route = createFileRoute("/")({
	component: App,
	loader: async ({ context }) => {
		const ids = await context.queryClient.ensureQueryData(
			feedStoryIdsQueryOptions("top"),
		);
		await Promise.all(
			ids
				.slice(0, PAGE_SIZE)
				.map((id) =>
					context.queryClient.ensureQueryData(storyItemQueryOptions(id)),
				),
		);
	},
});

const feedTabs: Array<{
	key: HackerNewsFeedKey;
	label: string;
	title: string;
}> = [
	{ key: "top", label: "Top", title: "Top stories" },
	{ key: "new", label: "New", title: "New stories" },
	{ key: "best", label: "Best", title: "Best stories" },
];

export function App() {
	const [activeFeed, setActiveFeed] = useState<HackerNewsFeedKey>("top");
	const [loadedCounts, setLoadedCounts] = useState<
		Record<HackerNewsFeedKey, number>
	>({ top: PAGE_SIZE, new: PAGE_SIZE, best: PAGE_SIZE });

	// Tracks how many items have been fully batch-committed (all settled together).
	// Items below this index render as cards; items at or above render as skeletons
	// until the whole current batch settles, then flip to cards all at once.
	const [committedCounts, setCommittedCounts] = useState<
		Record<HackerNewsFeedKey, number>
	>({ top: 0, new: 0, best: 0 });
	const committedCount = committedCounts[activeFeed];

	const activeFeedMeta =
		feedTabs.find((feed) => feed.key === activeFeed) ?? feedTabs[0];
	const loadedCount = loadedCounts[activeFeed];

	const idsQuery = useQuery(feedStoryIdsQueryOptions(activeFeed));
	const allIds = idsQuery.data ?? [];
	const displayedIds = allIds.slice(0, loadedCount);
	const hasMore = allIds.length > loadedCount;
	const nextBatchSize = Math.min(allIds.length - loadedCount, PAGE_SIZE);

	const itemQueries = useQueries({
		queries: displayedIds.map((id) => storyItemQueryOptions(id)),
	});

	const isAnyItemLoading = itemQueries.some((q) => q.isPending);
	const allDisplayedSettled =
		itemQueries.length > 0 && itemQueries.every((q) => !q.isPending);

	useEffect(() => {
		if (allDisplayedSettled && displayedIds.length > 0) {
			setCommittedCounts((prev) => ({
				...prev,
				[activeFeed]: displayedIds.length,
			}));
		}
	}, [allDisplayedSettled, displayedIds.length, activeFeed]);

	const activeStatus = idsQuery.isPending
		? "loading"
		: idsQuery.isError
			? "error"
			: allIds.length === 0
				? "empty"
				: "ready";

	const loadMore = () => {
		setLoadedCounts((prev) => ({
			...prev,
			[activeFeed]: prev[activeFeed] + PAGE_SIZE,
		}));
	};

	return (
		<main className="page-wrap px-4 pb-14 pt-8 sm:pt-10">
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
								const query = itemQueries[positionIndex];

								// Items below committedCount were settled in a previous batch — always show as cards.
								// Items at or above committedCount are in the current loading batch:
								//   - show skeletons until the whole batch settles, then flip all at once.
								const inLoadingBatch = positionIndex >= committedCount;
								if (inLoadingBatch && !allDisplayedSettled) {
									return (
										<StoryCardSkeleton key={`${activeFeed}-${storyId}`} index={positionIndex} />
									);
								}

								const story = query?.data;
								if (!story) return null;

								return (
									<StoryCard
										key={`${activeFeed}-${storyId}`}
										story={story}
										rank={positionIndex + 1}
									/>
								);
							})}
						</div>

						{hasMore ? (
							<div className="flex justify-center pt-4">
								<button
									type="button"
									onClick={loadMore}
									disabled={isAnyItemLoading}
									className="border border-(--chip-line) rounded px-5 py-2 text-sm font-medium text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft) disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
								>
									{isAnyItemLoading
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
							The feed came back empty. A quick refresh should pick up new items.
						</p>
						<div className="mt-5">
							<button
								type="button"
								onClick={() => idsQuery.refetch()}
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
							The Hacker News request failed. Check your connection and try again.
						</p>
						<div className="mt-5 flex flex-wrap gap-4">
							<button
								type="button"
								onClick={() => idsQuery.refetch()}
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
