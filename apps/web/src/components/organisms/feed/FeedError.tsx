import { getTraceId } from "@hackerfeed/runtime/logger";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { ExternalLink } from "@hackerfeed/ui/atoms/Link";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { TraceIdNote } from "@hackerfeed/ui/molecules/TraceIdNote";
import type { feedTabs } from "#/components/organisms/feed/feedTabs";

type FeedErrorProps = {
	feed: (typeof feedTabs)[number];
	onRetry: () => void;
};

export function FeedError({ feed, onRetry }: FeedErrorProps) {
	return (
		<EmptyState
			kicker="Feed unavailable"
			title={`Couldn't load ${feed.title.toLowerCase()}.`}
			headingLevel={3}
			headingSize="section"
			description="The Hacker News request failed. Check your connection and try again."
			action={
				<Row gap="lg" wrap>
					<Button variant="secondary" onClick={onRetry}>
						Retry &rarr;
					</Button>
					<ExternalLink href="https://github.com/HackerNews/API">
						API status
					</ExternalLink>
				</Row>
			}
		>
			<TraceIdNote traceId={getTraceId()} />
		</EmptyState>
	);
}
