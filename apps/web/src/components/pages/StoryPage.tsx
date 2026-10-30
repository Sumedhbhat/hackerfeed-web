import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PageContainer } from "@hackerfeed/ui/atoms/PageContainer";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { BackLink } from "@hackerfeed/ui/molecules/BackLink";
import { StoryPageSkeleton } from "@hackerfeed/ui/molecules/StoryPageSkeleton";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { Comment } from "#/components/organisms/story/Comment";
import { StoryArticle } from "#/components/organisms/story/StoryArticle";
import { useStoryPage } from "#/hooks/useStoryPage";

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

	if (!story) return null;

	return (
		<PageContainer>
			<BackLink
				label={
					<>
						<Icon icon={ArrowLeft} /> Feed
					</>
				}
			/>

			<Stack gap="xl">
				<StoryArticle story={story} />

				<Stack as="section" gap="lg">
					<Heading level={2} size="small">
						{story.descendants != null
							? `${story.descendants} comments`
							: "Discussion"}
					</Heading>

					{story.kids.length === 0 ? (
						<Text tone="soft">No comments yet.</Text>
					) : (
						<Stack gap="xs" divided>
							{commentQueries.map((q) => {
								if (!q.data) return null;
								return <Comment key={q.data.id} comment={q.data} depth={0} />;
							})}
						</Stack>
					)}
				</Stack>
			</Stack>
		</PageContainer>
	);
}
