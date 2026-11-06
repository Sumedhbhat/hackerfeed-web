import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
} from "@hackerfeed/hacker-news/utils";
import { ButtonLink, ExternalButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { ExternalLink } from "@hackerfeed/ui/atoms/Link";
import { Prose } from "@hackerfeed/ui/atoms/Prose";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { ArrowUpRight, Bookmark, Sparkles } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";

/** Top of the story page: title, body text, facts and what you can do with it. */
export function StoryArticle({ story }: { story: HackerNewsStoryRecord }) {
	const title = getStoryTitle(story);
	const aiChat = useFeatureFlag("aiChat");
	const { recordStoryView } = useViewActivity();
	const { isFavorited, toggleFavorite } = useFavorites();
	const isFav = isFavorited(story.id);

	return (
		<Stack as="header" gap="md">
			<StoryMeta
				domain={story.url ? getStoryDomain(story.url) : null}
				score={story.score}
				by={story.by}
				age={formatStoryAge(story.time)}
				trailing={
					<ExternalLink href={getDiscussionUrl(story.id)} variant="accent">
						View on HN
					</ExternalLink>
				}
			/>
			<Heading level={1} size="title">
				{title}
			</Heading>

			{/* Story body text (Ask HN / Show HN posts) */}
			{story.text && <Prose html={story.text} />}

			<Row gap="sm" wrap>
				{story.url && (
					<ExternalButtonLink
						href={story.url}
						onClick={() => recordStoryView(story, "read")}
					>
						Read article <Icon icon={ArrowUpRight} />
					</ExternalButtonLink>
				)}
				{aiChat ? (
					<ButtonLink
						variant="soft"
						to="/chat/$storyId"
						params={{ storyId: story.id }}
						aria-label={`Ask AI about ${title}`}
						onClick={() => recordStoryView(story, "chat_opened")}
					>
						<Icon icon={Sparkles} />
						Ask AI
					</ButtonLink>
				) : null}
				<ToggleButton
					aria-label={`Save ${title}`}
					pressed={isFav}
					onPressedChange={() => toggleFavorite(story)}
				>
					<Icon icon={Bookmark} filled={isFav} />
					<ToggleLabel on={isFav} offLabel="Save" onLabel="Saved" />
				</ToggleButton>
			</Row>
		</Stack>
	);
}
