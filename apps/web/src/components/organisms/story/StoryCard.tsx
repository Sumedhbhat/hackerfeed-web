import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
	isDiscussionPost,
	splitPostKind,
} from "@hackerfeed/hacker-news/utils";
import { ButtonLink } from "@hackerfeed/ui/atoms/Button";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { ExternalLink, TextLink } from "@hackerfeed/ui/atoms/Link";
import { TitleTag } from "@hackerfeed/ui/atoms/TitleTag";
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { WideText } from "@hackerfeed/ui/atoms/WideText";
import { FeedRow } from "@hackerfeed/ui/molecules/FeedRow";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { Bookmark, MessageSquare, Sparkles } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";
import { rememberReturnFocus } from "#/lib/a11y/return-focus";

type StoryCardProps = {
	story: HackerNewsStoryRecord;
	/** Tint the row once saved; off in the Saved list, where everything is saved. */
	markSaved?: boolean;
};

export function StoryCard({ story, markSaved = true }: StoryCardProps) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const { recordStoryView } = useViewActivity();
	const aiChat = useFeatureFlag("aiChat");
	const isFav = isFavorited(story.id);

	const title = getStoryTitle(story);
	const { kind: postKind, text: titleText } = splitPostKind(title);
	const comments = story.descendants ?? 0;
	// Ask HN, Show HN and link-less posts are their HN thread: open the
	// discussion view (question or description, then replies) instead.
	const opensDiscussion = isDiscussionPost(story);
	const commentLabel = `${comments} ${comments === 1 ? "comment" : "comments"}`;

	function recordRead() {
		recordStoryView(story, "read");
	}

	function recordMiddleClickRead(event: React.MouseEvent) {
		if (event.button === 1) recordRead();
	}

	return (
		<FeedRow
			saved={markSaved && isFav}
			title={
				<Heading level={2} size="row">
					{/* The "card" link: a click anywhere on the row opens the story. */}
					{opensDiscussion ? (
						<TextLink
							to="/story/$storyId"
							params={{ storyId: story.id }}
							variant="card"
							onClick={(event) => {
								rememberReturnFocus(event.currentTarget);
								recordStoryView(story, "discussion_opened");
							}}
						>
							{postKind ? <TitleTag>{postKind}</TitleTag> : null}
							{titleText}
						</TextLink>
					) : (
						<ExternalLink
							href={story.url ?? getDiscussionUrl(story.id)}
							variant="card"
							onClick={recordRead}
							onAuxClick={recordMiddleClickRead}
						>
							{postKind ? <TitleTag>{postKind}</TitleTag> : null}
							{titleText}
						</ExternalLink>
					)}
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
				aiChat ? (
					<ButtonLink
						key="ai"
						variant="accent"
						to="/chat/$storyId"
						params={{ storyId: story.id }}
						aria-label={`Discuss with AI: ${title}`}
						onClick={(event) => {
							rememberReturnFocus(event.currentTarget);
							recordStoryView(story, "chat_opened");
						}}
					>
						<Icon icon={Sparkles} accent />
						<span>
							Discuss<WideText from="xs"> with AI</WideText>
						</span>
					</ButtonLink>
				) : null,
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
