import * as Sentry from "@sentry/react";
import { Activity, Suspense, useState, useTransition } from "react";
import { PageContainer } from "#/components/atoms/PageContainer";
import { PendingContent } from "#/components/atoms/PendingContent";
import { Stack } from "#/components/atoms/Stack";
import { Tab, TabList, TabPanel, Tabs } from "#/components/atoms/Tabs";
import { StoryListSkeleton } from "#/components/molecules/StoryListSkeleton";
import { FeedError } from "#/components/organisms/feed/FeedError";
import { FeedPane } from "#/components/organisms/feed/FeedPane";
import { feedTabs } from "#/components/organisms/feed/feedTabs";
import { HackerNewsFeedKey, PAGE_SIZE } from "#/lib/hacker-news/queries";

export function FeedPage() {
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
		<PageContainer>
			<Tabs value={activeFeed} onValueChange={setActiveFeed}>
				<Stack gap="lg">
					<PendingContent pending={isPending}>
						<TabList aria-label="Feeds">
							{feedTabs.map((feed) => (
								<Tab key={feed.key} value={feed.key}>
									{feed.label}
								</Tab>
							))}
						</TabList>
					</PendingContent>

					{feedTabs.map((feed) => (
						<TabPanel key={feed.key} value={feed.key} keepMounted>
							<Activity mode={activeFeed === feed.key ? "visible" : "hidden"}>
								<Sentry.ErrorBoundary
									fallback={({ resetError }) => (
										<FeedError feed={feed} onRetry={resetError} />
									)}
								>
									<Suspense fallback={<StoryListSkeleton count={PAGE_SIZE} />}>
										<FeedPane feed={feed.key} />
									</Suspense>
								</Sentry.ErrorBoundary>
							</Activity>
						</TabPanel>
					))}
				</Stack>
			</Tabs>
		</PageContainer>
	);
}
