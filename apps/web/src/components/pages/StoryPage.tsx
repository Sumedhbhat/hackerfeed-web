import { Skeleton } from "@autoskeleton/react";
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
import {
	ArrowLeft,
	ArrowUpRight,
	ChevronsDownUp,
	ChevronsUpDown,
} from "lucide-react";
import { useState } from "react";
import { Comment } from "#/components/organisms/story/Comment";
import { StoryArticle } from "#/components/organisms/story/StoryArticle";
import { useRestoreReturnFocus } from "#/hooks/useRestoreReturnFocus";
import { useStoryPage } from "#/hooks/useStoryPage";
import {
	type ThreadExpansion,
	ThreadExpansionProvider,
} from "#/hooks/useThreadExpansion";
import { goBackIfReturningTo } from "#/lib/a11y/return-focus";
import { getDiscussionUrl } from "#/lib/hacker-news/display";

type StoryPageProps = {
	storyId: number;
};

/** Story detail screen: the story header card followed by its comment thread. */
export function StoryPage({ storyId }: StoryPageProps) {
	const { story, comments, loading } = useStoryPage(storyId);
	useRestoreReturnFocus(!loading && Boolean(story));
	const [expansion, setExpansion] = useState<ThreadExpansion>({
		mode: null,
		revision: 0,
	});
	const allExpanded = expansion.mode === "expand";
	const hasReplies = comments.some((comment) => comment.kids.length > 0);

	if (!story) return null;

	return (
		<Skeleton loading={loading} label="Loading story">
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
										<Icon
											icon={allExpanded ? ChevronsDownUp : ChevronsUpDown}
										/>
										{allExpanded
											? "Collapse all replies"
											: "Expand all replies"}
									</Button>
								) : null}
								<ExternalLink
									href={getDiscussionUrl(story.id)}
									variant="accent"
								>
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
									{comments.map((comment) => (
										<Comment key={comment.id} comment={comment} depth={0} />
									))}
								</ThreadList>
							</ThreadExpansionProvider>
						)}
					</Stack>
				</Stack>
			</PageContainer>
		</Skeleton>
	);
}
