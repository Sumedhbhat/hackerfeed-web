import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Tab, TabList, TabPanel, Tabs } from "@hackerfeed/ui/atoms/Tabs";
import { StoryListSkeleton } from "@hackerfeed/ui/molecules/StoryListSkeleton";
import * as Sentry from "@sentry/react";
import { Activity, Suspense, useState } from "react";
import { FeedError } from "#/components/organisms/feed/FeedError";
import { FeedPane } from "#/components/organisms/feed/FeedPane";
import { feedTabs } from "#/components/organisms/feed/feedTabs";
import { HackerNewsFeedKey, PAGE_SIZE } from "#/lib/hacker-news/queries";

export function FeedPage() {
	const [activeFeed, setActiveFeed] = useState<HackerNewsFeedKey>(
		HackerNewsFeedKey.Top,
	);

	return (
		<PageContainer>
			<Tabs value={activeFeed} onValueChange={setActiveFeed}>
				<Stack gap="lg">
					<TabList aria-label="Feeds">
						{feedTabs.map((feed) => (
							<Tab key={feed.key} value={feed.key}>
								{feed.label}
							</Tab>
						))}
					</TabList>

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
