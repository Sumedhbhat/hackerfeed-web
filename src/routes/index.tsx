import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	Suspense,
	useCallback,
	useState,
	useTransition,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { StoryCard, StoryCardSkeleton } from "#/components/StoryCard";
import { useFeed } from "#/hooks/useFeed";
import { useIntersectionObserver } from "#/hooks/useIntersectionObserver";
import {
	feedStoryIdsQueryOptions,
	HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";
import { logger } from "#/lib/logger";

const SKELETON_KEYS = Array.from(
	{ length: PAGE_SIZE },
	(_, i) => `skeleton-${i}`,
);

export const Route = createFileRoute("/")({
	component: App,
	loader: async ({ context }) => {
		try {
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
		} catch (err) {
			logger.error("Feed loader failed", {
				feed: HackerNewsFeedKey.Top,
				err: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack : undefined,
			});
			throw err;
		}
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

// ---------------------------------------------------------------------------
// FeedSkeletons — Suspense fallback
// ---------------------------------------------------------------------------

function FeedSkeletons() {
	return (
		<div className="space-y-3">
			{SKELETON_KEYS.map((key, i) => (
				<StoryCardSkeleton key={key} index={i} />
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// FeedError — ErrorBoundary fallback
// ---------------------------------------------------------------------------

type FeedErrorProps = {
	feed: (typeof feedTabs)[number];
	onRetry: () => void;
};

function FeedError({ feed, onRetry }: FeedErrorProps) {
	return (
		<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
			<p className="island-kicker mb-3">Feed unavailable</p>
			<h3 className="m-0 text-xl font-semibold tracking-tight text-(--sea-ink)">
				Couldn&apos;t load {feed.title.toLowerCase()}.
			</h3>
			<p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-(--sea-ink-soft)">
				The Hacker News request failed. Check your connection and try again.
			</p>
			<div className="mt-5 flex flex-wrap gap-4">
				<button
					type="button"
					onClick={onRetry}
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
	);
}
// ---------------------------------------------------------------------------
// FeedPane — one instance per Activity boundary
// ---------------------------------------------------------------------------

type FeedPaneProps = {
	feed: HackerNewsFeedKey;
};

function FeedPane({ feed }: FeedPaneProps) {
	const {
		displayedIds,
		storyQueries,
		isPending,
		hasMore,
		nextBatchSize,
		activeStatus,
		loadMore,
		refetch,
	} = useFeed(feed);

	const feedLabel =
		(feedTabs.find((f) => f.key === feed) ?? feedTabs[0])?.label ?? feed;

	const sentinelRef = useIntersectionObserver(
		useCallback(() => {
			if (hasMore && !isPending) loadMore();
		}, [hasMore, isPending, loadMore]),
		{ rootMargin: "0px" },
	);

	if (activeStatus === "empty") {
		return (
			<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
				<p className="island-kicker mb-3">Nothing here yet</p>
				<h3 className="m-0 text-xl font-semibold tracking-tight text-(--sea-ink)">
					No {feedLabel.toLowerCase()} stories found.
				</h3>
				<p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-(--sea-ink-soft)">
					The feed came back empty. A quick refresh should pick up new items.
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
		);
	}

	// activeStatus === "ready"
	return (
		<>
			<div className="space-y-3">
				{displayedIds.map((storyId, i) => {
					const story = storyQueries[i]?.data;
					if (!story) return null;
					return <StoryCard key={`${feed}-${storyId}`} story={story} />;
				})}
			</div>

			{/* Auto-load sentinel */}
			{hasMore && <div ref={sentinelRef} aria-hidden="true" />}

			{/* Explicit "Load more" fallback */}
			{hasMore && (
				<div className="flex justify-center pt-4">
					<button
						type="button"
						onClick={loadMore}
						disabled={isPending}
						className="border border-(--chip-line) rounded px-5 py-2 text-sm font-medium text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft) disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
					>
						{isPending ? "Loading\u2026" : `Load ${nextBatchSize} more`}
					</button>
				</div>
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------

function App() {
	const [activeFeed, setActiveFeedState] = useState<HackerNewsFeedKey>(
		HackerNewsFeedKey.Top,
	);
	const [isPending, startTransition] = useTransition();

	const setActiveFeed = (feed: HackerNewsFeedKey) => {
		startTransition(() => {
			setActiveFeedState(feed);
		});
	};

	return (
		<main className="page-wrap px-4 pb-10 pt-5 sm:pt-10 sm:pb-14">
			<div className="space-y-6">
				{/* Feed tabs — editorial underline style */}
				<div
					className={`flex items-center gap-6 border-b border-(--line) transition-opacity ${
						isPending ? "opacity-50 pointer-events-none" : ""
					}`}
				>
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

				{/* One Activity + Suspense + ErrorBoundary per tab */}
				{feedTabs.map((feed) => (
					<Activity
						key={feed.key}
						mode={activeFeed === feed.key ? "visible" : "hidden"}
					>
						<ErrorBoundary
							fallbackRender={({ resetErrorBoundary }) => (
								<FeedError feed={feed} onRetry={resetErrorBoundary} />
							)}
							resetKeys={[feed.key]}
						>
							<Suspense fallback={<FeedSkeletons />}>
								<FeedPane feed={feed.key} />
							</Suspense>
						</ErrorBoundary>
					</Activity>
				))}
			</div>
		</main>
	);
}
