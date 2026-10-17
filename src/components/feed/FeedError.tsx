import { Button } from "#/components/atoms/Button";
import type { feedTabs } from "#/components/feed/feedTabs";
import { TraceIdNote } from "#/components/molecules/TraceIdNote";
import { getTraceId } from "#/lib/logger";

type FeedErrorProps = {
	feed: (typeof feedTabs)[number];
	onRetry: () => void;
};

export function FeedError({ feed, onRetry }: FeedErrorProps) {
	return (
		<article className="island-shell rise-in rounded-lg p-6 sm:p-8">
			<p className="island-kicker mb-3">Feed unavailable</p>
			<h3 className="m-0 text-xl font-semibold tracking-tight text-(--sea-ink)">
				Couldn&apos;t load {feed.title.toLowerCase()}.
			</h3>
			<p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-(--sea-ink-soft)">
				The Hacker News request failed. Check your connection and try again.
			</p>
			<TraceIdNote traceId={getTraceId()} />
			<div className="mt-5 flex flex-wrap gap-4">
				<Button variant="secondary" onClick={onRetry}>
					Retry &rarr;
				</Button>
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
