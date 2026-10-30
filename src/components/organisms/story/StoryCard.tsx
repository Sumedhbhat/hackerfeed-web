import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
} from "@hackerfeed/hacker-news/utils";
import { MessageCircle, Star } from "lucide-react";
import { Button } from "#/components/atoms/Button";
import { Card } from "#/components/atoms/Card";
import { Heading } from "#/components/atoms/Heading";
import { Icon } from "#/components/atoms/Icon";
import { TextLink } from "#/components/atoms/Link";
import { Row } from "#/components/atoms/Row";
import { Stack } from "#/components/atoms/Stack";
import { ToggleButton } from "#/components/atoms/Toggle";
import { MetaLine } from "#/components/molecules/MetaLine";
import { StoryStats } from "#/components/molecules/StoryStats";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";
import { openLink } from "#/lib/open-link";

type StoryCardProps = {
	story: HackerNewsStoryRecord;
	animationDelay?: number;
};

export function StoryCard({ story, animationDelay }: StoryCardProps) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const { recordStoryView } = useViewActivity();
	const aiChat = useFeatureFlag("aiChat");
	const isFav = isFavorited(story.id);

	const domain = getStoryDomain(story.url);
	const age = formatStoryAge(story.time);
	const title = getStoryTitle(story);
	const storyUrl = story.url ?? getDiscussionUrl(story.id);

	function openStory() {
		recordStoryView(story, "read");
		openLink(storyUrl);
	}

	return (
		<Card animated animationDelay={animationDelay}>
			<MetaLine items={[domain, age]} />
			<Stack gap="md">
				<Heading
					level={3}
					size="card"
					onClick={openStory}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") openStory();
					}}
				>
					{title}
				</Heading>

				<StoryStats
					score={story.score}
					by={story.by}
					commentCount={story.descendants}
				/>

				<Row gap="lg" wrap>
					<Button variant="ghost" onClick={openStory}>
						{story.url ? "Read article" : "Open post"}
					</Button>

					<TextLink
						to="/story/$storyId"
						params={{ storyId: story.id }}
						onClick={() => recordStoryView(story, "discussion_opened")}
					>
						Discussion
					</TextLink>

					{aiChat ? (
						<TextLink
							to="/chat/$storyId"
							params={{ storyId: story.id }}
							aria-label={`Discuss ${title} with AI`}
							onClick={() => recordStoryView(story, "chat_opened")}
						>
							<Icon icon={MessageCircle} />
							Discuss
						</TextLink>
					) : null}

					<ToggleButton
						aria-label="Save to favorites"
						pressed={isFav}
						onPressedChange={() => toggleFavorite(story)}
					>
						{isFav ? (
							<>
								<Icon key="star-filled" icon={Star} filled pop /> Saved
							</>
						) : (
							<>
								<Icon key="star-empty" icon={Star} /> Save
							</>
						)}
					</ToggleButton>
				</Row>
			</Stack>
		</Card>
	);
}
