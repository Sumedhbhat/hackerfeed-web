import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
	splitPostKind,
} from "@hackerfeed/hacker-news/utils";
import { ButtonLink, ExternalButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { ExternalLink } from "@hackerfeed/ui/atoms/Link";
import { NarrowText } from "@hackerfeed/ui/atoms/NarrowText";
import { TitleTag } from "@hackerfeed/ui/atoms/TitleTag";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { WideText } from "@hackerfeed/ui/atoms/WideText";
import { FeedRow } from "@hackerfeed/ui/molecules/FeedRow";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { ArrowUpRight, Bookmark, MessageSquare, Sparkles } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";
import { rememberReturnFocus } from "#/lib/a11y/return-focus";

type StoryCardProps = {
	story: HackerNewsStoryRecord;
	/** Position in a ranked feed; omit for unranked lists such as favorites. */
	rank?: number;
	/** Tint the row once saved; off in the Saved list, where everything is saved. */
	markSaved?: boolean;
};

export function StoryCard({ story, rank, markSaved = true }: StoryCardProps) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const { recordStoryView } = useViewActivity();
	const aiChat = useFeatureFlag("aiChat");
	const isFav = isFavorited(story.id);

	const title = getStoryTitle(story);
	const { kind: postKind, text: titleText } = splitPostKind(title);
	const storyUrl = story.url ?? getDiscussionUrl(story.id);
	const comments = story.descendants ?? 0;
	const readLabel = story.url ? "Read article" : "Open on HN";
	const commentLabel = `${comments} ${comments === 1 ? "comment" : "comments"}`;

	function recordRead() {
		recordStoryView(story, "read");
	}

	function recordMiddleClickRead(event: React.MouseEvent) {
		if (event.button === 1) recordRead();
	}

	return (
		<FeedRow
			rank={rank}
			saved={markSaved && isFav}
			title={
				<Heading level={2} size="row">
					<ExternalLink
						href={storyUrl}
						variant="plain"
						// "Read article" right after goes to the same place and carries the
						// full name, so keyboard users get one stop per destination.
						tabIndex={-1}
						onClick={recordRead}
						onAuxClick={recordMiddleClickRead}
					>
						{postKind ? <TitleTag>{postKind}</TitleTag> : null}
						{titleText}
					</ExternalLink>
				</Heading>
			}
			meta={
				<StoryMeta
					domain={story.url ? getStoryDomain(story.url) : null}
					score={story.score}
					by={story.by}
					age={formatStoryAge(story.time)}
				/>
			}
			actions={[
				<ExternalButtonLink
					key="read"
					href={storyUrl}
					variant="accent"
					aria-label={`${readLabel}: ${title}`}
					onClick={recordRead}
					onAuxClick={recordMiddleClickRead}
				>
					{story.url ? (
						<span>
							Read<WideText from="xs"> article</WideText>
						</span>
					) : (
						<span>
							<WideText from="xs">Open on HN</WideText>
							<NarrowText>On HN</NarrowText>
						</span>
					)}
					<Icon icon={ArrowUpRight} size={14} />
				</ExternalButtonLink>,
				<ButtonLink
					key="comments"
					variant={comments > 0 ? "ghost" : "quiet"}
					to="/story/$storyId"
					params={{ storyId: story.id }}
					aria-label={`${commentLabel}: ${title}`}
					onClick={(event) => {
						rememberReturnFocus(event.currentTarget);
						recordStoryView(story, "discussion_opened");
					}}
				>
					<Icon icon={MessageSquare} />
					<span>
						{comments}
						<WideText>{comments === 1 ? " comment" : " comments"}</WideText>
					</span>
				</ButtonLink>,
				aiChat ? (
					<ButtonLink
						key="ai"
						variant="ghost"
						to="/chat/$storyId"
						params={{ storyId: story.id }}
						aria-label={`Ask AI about ${title}`}
						onClick={(event) => {
							rememberReturnFocus(event.currentTarget);
							recordStoryView(story, "chat_opened");
						}}
					>
						<Icon icon={Sparkles} accent />
						<span>
							<WideText from="min">Ask </WideText>AI
						</span>
					</ButtonLink>
				) : null,
			]}
			save={
				<ToggleButton
					aria-label={`${isFav ? "Saved" : "Save"} ${title}`}
					pressed={isFav}
					onPressedChange={() => toggleFavorite(story)}
				>
					<Icon icon={Bookmark} filled={isFav} />
					<ToggleLabel on={isFav} offLabel="Save" onLabel="Saved" />
				</ToggleButton>
			}
		/>
	);
}
