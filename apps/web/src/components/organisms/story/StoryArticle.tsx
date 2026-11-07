import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	formatStoryAge,
	getStoryDomain,
	getStoryTitle,
	splitPostKind,
} from "@hackerfeed/hacker-news/utils";
import { ButtonLink, ExternalButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { Prose } from "@hackerfeed/ui/atoms/Prose";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { TitleTag } from "@hackerfeed/ui/atoms/TitleTag";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { ArrowUpRight, Bookmark, Sparkles } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";
import { rememberReturnFocus } from "#/lib/a11y/return-focus";

/** Top of the story page: title, body text, facts and what you can do with it. */
export function StoryArticle({ story }: { story: HackerNewsStoryRecord }) {
	const title = getStoryTitle(story);
	const { kind: postKind, text: titleText } = splitPostKind(title);
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
			/>
			<Heading level={1} size="title">
				{postKind ? <TitleTag size="headline">{postKind}</TitleTag> : null}
				{titleText}
			</Heading>

			{/* Story body text (Ask HN / Show HN posts) */}
			{story.text && <Prose html={story.text} />}

			<Row gap="sm" wrap>
				{story.url && (
					<ExternalButtonLink
						href={story.url}
						onClick={() => recordStoryView(story, "read")}
					>
						Read article <Icon icon={ArrowUpRight} size={14} />
					</ExternalButtonLink>
				)}
				{aiChat ? (
					<ButtonLink
						variant="soft"
						to="/chat/$storyId"
						params={{ storyId: story.id }}
						aria-label={`Ask AI about ${title}`}
						onClick={(event) => {
							rememberReturnFocus(event.currentTarget);
							recordStoryView(story, "chat_opened");
						}}
					>
						<Icon icon={Sparkles} accent />
						Ask AI
					</ButtonLink>
				) : null}
				<ToggleButton
					aria-label={`${isFav ? "Saved" : "Save"} ${title}`}
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
