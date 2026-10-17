import { ArrowLeft } from "lucide-react";
import { Icon } from "#/components/atoms/Icon";
import { PageContainer } from "#/components/atoms/PageContainer";
import { BackLink } from "#/components/molecules/BackLink";
import { EmptyState } from "#/components/molecules/EmptyState";
import { TraceIdNote } from "#/components/molecules/TraceIdNote";
import { useErrorReport } from "#/hooks/useErrorReport";

/** Shown when the story route's loader or render fails. */
export function StoryErrorPage({ error }: { error: unknown }) {
	const traceId = useErrorReport("Story page failed", error);

	return (
		<PageContainer>
			<BackLink
				label={
					<>
						<Icon icon={ArrowLeft} /> Feed
					</>
				}
			/>
			<EmptyState
				kicker="Story unavailable"
				title="Couldn't load this story."
				headingLevel={1}
				headingSize="section"
				description="The Hacker News request failed. Check your connection and try again."
			>
				<TraceIdNote traceId={traceId} />
			</EmptyState>
		</PageContainer>
	);
}
