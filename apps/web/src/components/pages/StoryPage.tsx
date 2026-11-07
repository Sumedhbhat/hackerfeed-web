import { getDiscussionUrl } from "@hackerfeed/hacker-news/utils";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { ExternalLink } from "@hackerfeed/ui/atoms/Link";
import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { ThreadList } from "@hackerfeed/ui/atoms/ThreadItem";
import { BackLink } from "@hackerfeed/ui/molecules/BackLink";
import { StoryPageSkeleton } from "@hackerfeed/ui/molecules/StoryPageSkeleton";
import {
	ArrowLeft,
	ArrowUpRight,
	ChevronsDownUp,
	ChevronsUpDown,
} from "lucide-react";
import { Suspense, useState } from "react";
import { Comment } from "#/components/organisms/story/Comment";
import { StoryArticle } from "#/components/organisms/story/StoryArticle";
import { useRestoreReturnFocus } from "#/hooks/useRestoreReturnFocus";
import { useStoryPage } from "#/hooks/useStoryPage";
import {
	type ThreadExpansion,
	ThreadExpansionProvider,
} from "#/hooks/useThreadExpansion";
import { goBackIfReturningTo } from "#/lib/a11y/return-focus";

type StoryPageProps = {
	storyId: number;
};

/** Story detail screen: the story header card followed by its comment thread. */
export function StoryPage({ storyId }: StoryPageProps) {
	return (
		<Suspense fallback={<StoryPageSkeleton />}>
			<StoryContent storyId={storyId} />
		</Suspense>
	);
}

// Separate component so useStoryPage's suspense queries sit under the Suspense above.
function StoryContent({ storyId }: StoryPageProps) {
	const { story, commentQueries } = useStoryPage(storyId);
	useRestoreReturnFocus(Boolean(story));
	const [expansion, setExpansion] = useState<ThreadExpansion>({
		mode: null,
		revision: 0,
	});
	const allExpanded = expansion.mode === "expand";
	const hasReplies = commentQueries.some((q) => (q.data?.kids.length ?? 0) > 0);

	if (!story) return null;

	return (
		<PageContainer>
			<BackLink
				onClick={(event) => {
					if (goBackIfReturningTo("/")) event.preventDefault();
				}}
				label={
					<>
						<Icon icon={ArrowLeft} /> Stories
					</>
				}
			/>

			<Stack gap="xl" measure>
				<StoryArticle story={story} />

				<Stack as="section" gap="lg">
					<Row justify="between" align="center" wrap>
						<Heading level={2} size="section">
							{story.descendants != null
								? `${story.descendants} comments`
								: "Discussion"}
						</Heading>
						<Row gap="sm" align="center" wrap>
							{hasReplies ? (
								<Button
									variant="ghost"
									onClick={() =>
										setExpansion((current) => ({
											mode: current.mode === "expand" ? "collapse" : "expand",
											revision: current.revision + 1,
										}))
									}
								>
									<Icon icon={allExpanded ? ChevronsDownUp : ChevronsUpDown} />
									{allExpanded ? "Collapse all replies" : "Expand all replies"}
								</Button>
							) : null}
							<ExternalLink href={getDiscussionUrl(story.id)} variant="accent">
								View on HN <Icon icon={ArrowUpRight} size={14} />
							</ExternalLink>
						</Row>
					</Row>
					<LiveStatus
						message={
							expansion.mode === "expand"
								? "All replies expanded."
								: expansion.mode === "collapse"
									? "All replies collapsed."
									: ""
						}
					/>

					{story.kids.length === 0 ? (
						<Text tone="soft">No comments yet.</Text>
					) : (
						<ThreadExpansionProvider value={expansion}>
							<ThreadList divided aria-label="Comments">
								{commentQueries.map((q) => {
									if (!q.data) return null;
									return <Comment key={q.data.id} comment={q.data} depth={0} />;
								})}
							</ThreadList>
						</ThreadExpansionProvider>
					)}
				</Stack>
			</Stack>
		</PageContainer>
	);
}
