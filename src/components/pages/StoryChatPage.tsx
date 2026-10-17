import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Icon } from "#/components/atoms/Icon";
import { PageContainer } from "#/components/atoms/PageContainer";
import { BackLink } from "#/components/molecules/BackLink";
import { CardSkeleton } from "#/components/molecules/CardSkeleton";
import { NoticeCard } from "#/components/molecules/NoticeCard";
import { StoryChat } from "#/components/organisms/chat/StoryChat";
import { storyQueryOptions } from "#/lib/hacker-news/queries";

type StoryChatPageProps = { storyId: number };

export function StoryChatPage({ storyId }: StoryChatPageProps) {
	const {
		data: story,
		isPending,
		isError,
	} = useQuery(storyQueryOptions(storyId));

	return (
		<PageContainer>
			<BackLink
				to={`/story/${storyId}`}
				label={
					<>
						<Icon icon={ArrowLeft} /> Story
					</>
				}
			/>

			{isPending ? (
				<CardSkeleton width="75%" height="xl" />
			) : isError || !story ? (
				<NoticeCard
					title="Story unavailable."
					message="This story couldn't be loaded."
				/>
			) : (
				<StoryChat story={story} />
			)}
		</PageContainer>
	);
}
