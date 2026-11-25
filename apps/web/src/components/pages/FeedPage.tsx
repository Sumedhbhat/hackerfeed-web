import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Tab, TabList, TabPanel, Tabs } from "@hackerfeed/ui/atoms/Tabs";
import { PageHeader } from "@hackerfeed/ui/molecules/PageHeader";
import * as Sentry from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, useEffect, useState } from "react";
import { FeedError } from "#/components/organisms/feed/FeedError";
import { FeedPane } from "#/components/organisms/feed/FeedPane";
import { feedTabs } from "#/components/organisms/feed/feedTabs";
import { HackerNewsFeedKey, prefetchFeed } from "#/lib/hacker-news/queries";

export function FeedPage() {
	const [activeFeed, setActiveFeed] = useState<HackerNewsFeedKey>(
		HackerNewsFeedKey.Top,
	);
	const [openedFeeds, setOpenedFeeds] = useState(() => new Set([activeFeed]));

	function openFeed(feed: HackerNewsFeedKey) {
		setActiveFeed(feed);
		setOpenedFeeds((opened) => new Set(opened).add(feed));
	}

	const queryClient = useQueryClient();
	useEffect(() => {
		let cancelled = false;
		const cancelIdle = whenPageIdle(async () => {
			await Promise.allSettled(
				feedTabs.map((feed) => prefetchFeed(queryClient, feed.key)),
			);
			if (!cancelled) setOpenedFeeds(new Set(feedTabs.map((feed) => feed.key)));
		});
		return () => {
			cancelled = true;
			cancelIdle();
		};
	}, [queryClient]);

	return (
		<PageContainer>
			<Tabs value={activeFeed} onValueChange={openFeed}>
				<Stack gap="lg">
					<PageHeader title="Stories" hideTitle>
						<TabList aria-label="Feeds">
							{feedTabs.map((feed) => (
								<Tab key={feed.key} value={feed.key}>
									{feed.label}
								</Tab>
							))}
						</TabList>
					</PageHeader>

					{feedTabs.map((feed) => (
						<TabPanel key={feed.key} value={feed.key} keepMounted>
							{openedFeeds.has(feed.key) && (
								<Activity mode={activeFeed === feed.key ? "visible" : "hidden"}>
									<Sentry.ErrorBoundary
										fallback={({ resetError }) => (
											<FeedError feed={feed} onRetry={resetError} />
										)}
									>
										<FeedPane
											feed={feed.key}
											prefetchNextBatch={activeFeed === feed.key}
										/>
									</Sentry.ErrorBoundary>
								</Activity>
							)}
						</TabPanel>
					))}
				</Stack>
			</Tabs>
		</PageContainer>
	);
}

/** Runs `callback` once the page has loaded and the main thread is idle. */
function whenPageIdle(callback: () => void) {
	let idle: number | undefined;
	const schedule = () => {
		idle = window.requestIdleCallback
			? window.requestIdleCallback(callback)
			: window.setTimeout(callback, 1);
	};
	if (document.readyState === "complete") schedule();
	else window.addEventListener("load", schedule, { once: true });

	return () => {
		window.removeEventListener("load", schedule);
		if (idle === undefined) return;
		if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
		else window.clearTimeout(idle);
	};
}
