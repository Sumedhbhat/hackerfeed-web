import * as Sentry from "@sentry/react";
import { Activity, Suspense, useState, useTransition } from "react";
import { FeedError } from "#/components/feed/FeedError";
import { FeedPane } from "#/components/feed/FeedPane";
import { FeedSkeletons } from "#/components/feed/FeedSkeletons";
import { feedTabs } from "#/components/feed/feedTabs";
import { Tab } from "#/components/ui/atoms/Tab";
import { TabList } from "#/components/ui/molecules/TabList";
import { HackerNewsFeedKey } from "#/lib/hacker-news/queries";

export function FeedApp() {
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
				<div
					className={`transition-opacity ${
						isPending ? "opacity-50 pointer-events-none" : ""
					}`}
				>
					<TabList>
						{feedTabs.map((feed) => {
							const isActive = activeFeed === feed.key;
							return (
								<Tab
									key={feed.key}
									onClick={() => setActiveFeed(feed.key)}
									aria-pressed={isActive}
								>
									{feed.label}
								</Tab>
							);
						})}
					</TabList>
				</div>

				{feedTabs.map((feed) => (
					<Activity
						key={feed.key}
						mode={activeFeed === feed.key ? "visible" : "hidden"}
					>
						<Sentry.ErrorBoundary
							fallback={({ resetError }) => (
								<FeedError feed={feed} onRetry={resetError} />
							)}
						>
							<Suspense fallback={<FeedSkeletons />}>
								<FeedPane feed={feed.key} />
							</Suspense>
						</Sentry.ErrorBoundary>
					</Activity>
				))}
			</div>
		</main>
	);
}
