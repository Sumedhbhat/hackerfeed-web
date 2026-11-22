import { CHAT_PROVIDERS } from "@hackerfeed/entities/chat-providers";
import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import { ExternalButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { Prose } from "@hackerfeed/ui/atoms/Prose";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { TitleTag } from "@hackerfeed/ui/atoms/TitleTag";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { ChatLink } from "@hackerfeed/ui/molecules/ChatLink";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { ArrowUpRight, Bookmark } from "lucide-react";
import { useChatProvider } from "#/hooks/useAppearance";
import { useFavorites } from "#/hooks/useFavorites";
import { useViewActivity } from "#/hooks/useViewActivity";
import {
	buildStoryChatUrl,
	formatStoryAge,
	getStoryDomain,
	getStoryTitle,
	splitPostKind,
} from "#/lib/hacker-news/display";

export function StoryArticle({ story }: { story: HackerNewsStoryRecord }) {
	const title = getStoryTitle(story);
	const { kind: postKind, text: titleText } = splitPostKind(title);
	const { recordStoryView } = useViewActivity();
	const { chatProvider } = useChatProvider();
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
				<ChatLink
					title={title}
					providerName={CHAT_PROVIDERS[chatProvider].name}
					chatUrl={buildStoryChatUrl(story, chatProvider)}
					onOpen={() => recordStoryView(story, "chat_opened")}
				/>
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
