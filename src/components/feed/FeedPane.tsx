import { useSuspenseQueries } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Activity, Suspense } from "react";
import { feedTabs } from "#/components/feed/feedTabs";
import { StoryCard } from "#/components/story-card";
import { FeedStatus, useFeed } from "#/hooks/useFeed";
import {
	type HackerNewsFeedKey,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

function NextBatchPrefetcher({ ids }: { ids: number[] }) {
	useSuspenseQueries({ queries: ids.map((id) => storyQueryOptions(id)) });
	return null;
}

type FeedPaneProps = {
	feed: HackerNewsFeedKey;
};

export function FeedPane({ feed }: FeedPaneProps) {
	const {
		displayedIds,
		nextBatchIds,
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

	if (activeStatus === FeedStatus.Empty) {
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
						Refresh feed <ArrowRight size={14} aria-hidden="true" />
					</button>
				</div>
			</article>
		);
	}

	return (
		<>
			<div className="space-y-3">
				{displayedIds.map((storyId, i) => {
					const story = storyQueries[i]?.data;
					if (!story) return null;
					return <StoryCard key={`${feed}-${storyId}`} story={story} />;
				})}
			</div>

			{hasMore && (
				<div className="flex justify-center pt-4">
					<button
						type="button"
						onClick={loadMore}
						disabled={isPending}
						className="border border-(--chip-line) rounded px-5 py-2 text-sm font-medium text-(--sea-ink-soft) hover:text-(--sea-ink) hover:border-(--sea-ink-soft) disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
					>
						{isPending ? "Loading..." : `Load ${nextBatchSize} more`}
					</button>
				</div>
			)}

			{hasMore && nextBatchIds.length > 0 && (
				<Activity mode="hidden">
					<Suspense fallback={null}>
						<NextBatchPrefetcher ids={nextBatchIds} />
					</Suspense>
				</Activity>
			)}
		</>
	);
}
