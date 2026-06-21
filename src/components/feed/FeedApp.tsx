import * as Sentry from "@sentry/react";
import { Activity, Suspense, useState, useTransition } from "react";
import { FeedError } from "#/components/feed/FeedError";
import { FeedPane } from "#/components/feed/FeedPane";
import { FeedSkeletons } from "#/components/feed/FeedSkeletons";
import { feedTabs } from "#/components/feed/feedTabs";
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
