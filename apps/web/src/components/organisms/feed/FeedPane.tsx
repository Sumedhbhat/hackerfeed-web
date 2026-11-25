import { fake, Skeleton, usePlaceholder } from "@autoskeleton/react";
import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { ReadingList } from "@hackerfeed/ui/atoms/ReadingList";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { LoadMoreButton } from "@hackerfeed/ui/molecules/LoadMoreButton";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Activity } from "react";
import { feedTabs } from "#/components/organisms/feed/feedTabs";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { FeedStatus, useFeed } from "#/hooks/useFeed";
import { useLoadMoreFocus } from "#/hooks/useLoadMoreFocus";
import { useRestoreReturnFocus } from "#/hooks/useRestoreReturnFocus";
import { useStoriesLastViewed } from "#/hooks/useStoriesLastViewed";
import {
	type HackerNewsFeedKey,
	PAGE_SIZE,
	storyQueryOptions,
} from "#/lib/hacker-news/queries";

const STORIES_PLACEHOLDER: HackerNewsStoryRecord[] = fake.list(
	PAGE_SIZE,
	(i) => ({
		id: fake.id(i, "number"),
		by: fake.text(8, i),
		descendants: 88,
		kids: [],
		score: 888,
		text: null,
		time: null,
		title: fake.sentence(7 + (i % 5), i),
		type: "story",
		url: "https://example.com/",
	}),
);

function NextBatchPrefetcher({ ids }: { ids: number[] }) {
	useQueries({ queries: ids.map((id) => storyQueryOptions(id)) });
	return null;
}

type FeedPaneProps = {
	feed: HackerNewsFeedKey;
	/** Fetch the stories behind "Load more" ahead of the click. */
	prefetchNextBatch: boolean;
};

export function FeedPane({ feed, prefetchNextBatch }: FeedPaneProps) {
	const {
		stories: loadedStories,
		displayedIds,
		nextBatchIds,
		isPending,
		hasMore,
		nextBatchSize,
		activeStatus,
		loadMore,
		refetch,
	} = useFeed(feed);
	const { data: stories, loading } = usePlaceholder(
		loadedStories,
		STORIES_PLACEHOLDER,
	);
	const lastViewed = useStoriesLastViewed(displayedIds);

	const listId = `feed-${feed}-stories`;
	const renderedCount = loadedStories?.length ?? 0;
	const withFocus = useLoadMoreFocus(listId, renderedCount);
	useRestoreReturnFocus(renderedCount > 0);

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
			<Skeleton loading={loading} label="Loading stories">
				<ReadingList ordered id={listId} aria-label={`${feedLabel} stories`}>
					{stories.map((story) => (
						<StoryCard
							key={`${feed}-${story.id}`}
							story={{
								...story,
								lastViewedAt: lastViewed.get(story.id) ?? null,
							}}
						/>
					))}
				</ReadingList>
			</Skeleton>

			{hasMore && (
				<LoadMoreButton
					label={isPending ? "Loading..." : `Load ${nextBatchSize} more`}
					onClick={withFocus(loadMore)}
					busy={isPending}
				/>
			)}

			{prefetchNextBatch && hasMore && nextBatchIds.length > 0 && (
				<Activity mode="hidden">
					<NextBatchPrefetcher ids={nextBatchIds} />
				</Activity>
			)}
		</Stack>
	);
}
