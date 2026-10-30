import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { BackLink } from "@hackerfeed/ui/molecules/BackLink";
import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";
import { TraceIdNote } from "@hackerfeed/ui/molecules/TraceIdNote";
import { ArrowLeft } from "lucide-react";
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
