import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { LoadMoreButton } from "@hackerfeed/ui/molecules/LoadMoreButton";
import { useSuspenseQueries } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Activity, Suspense } from "react";
import { feedTabs } from "#/components/organisms/feed/feedTabs";
import { StoryCard } from "#/components/organisms/story/StoryCard";
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
			<EmptyState
				kicker="Nothing here yet"
				title={`No ${feedLabel.toLowerCase()} stories found.`}
				headingLevel={3}
				headingSize="section"
				description="The feed came back empty. A quick refresh should pick up new items."
				action={
					<Button variant="secondary" onClick={refetch}>
						Refresh feed <Icon icon={ArrowRight} />
					</Button>
				}
			/>
		);
	}

	return (
		<Stack gap="md">
			<Stack gap="md">
				{displayedIds.map((storyId, i) => {
					const story = storyQueries[i]?.data;
					if (!story) return null;
					return <StoryCard key={`${feed}-${storyId}`} story={story} />;
				})}
			</Stack>

			{hasMore && (
				<LoadMoreButton
					label={isPending ? "Loading..." : `Load ${nextBatchSize} more`}
					onClick={loadMore}
					disabled={isPending}
				/>
			)}

			{hasMore && nextBatchIds.length > 0 && (
				<Activity mode="hidden">
					<Suspense fallback={null}>
						<NextBatchPrefetcher ids={nextBatchIds} />
					</Suspense>
				</Activity>
			)}
		</Stack>
	);
}
