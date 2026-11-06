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
import { ToggleButton } from "@hackerfeed/ui/atoms/Toggle";
import { ToggleLabel } from "@hackerfeed/ui/atoms/ToggleLabel";
import { WideText } from "@hackerfeed/ui/atoms/WideText";
import { FeedRow } from "@hackerfeed/ui/molecules/FeedRow";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { ArrowUpRight, Bookmark, MessageSquare, Sparkles } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";

type StoryCardProps = {
	story: HackerNewsStoryRecord;
	/** Position in a ranked feed; omit for unranked lists such as favorites. */
	rank?: number;
	/** Hang the saved ribbon; off in the Saved list, where everything is saved. */
	markSaved?: boolean;
};

export function StoryCard({ story, rank, markSaved = true }: StoryCardProps) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const { recordStoryView } = useViewActivity();
	const aiChat = useFeatureFlag("aiChat");
	const isFav = isFavorited(story.id);

	const title = getStoryTitle(story);
	const storyUrl = story.url ?? getDiscussionUrl(story.id);
	const comments = story.descendants ?? 0;
	const readLabel = story.url ? "Read article" : "Open post";
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
						onClick={recordRead}
						onAuxClick={recordMiddleClickRead}
					>
						{title}
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
			actions={
				<>
					<ExternalButtonLink
						href={storyUrl}
						variant="accent"
						aria-label={`${readLabel}: ${title}`}
						onClick={recordRead}
						onAuxClick={recordMiddleClickRead}
					>
						{readLabel}
						<Icon icon={ArrowUpRight} size={14} />
					</ExternalButtonLink>

					<ButtonLink
						variant="ghost"
						to="/story/$storyId"
						params={{ storyId: story.id }}
						aria-label={`${commentLabel}: ${title}`}
						onClick={() => recordStoryView(story, "discussion_opened")}
					>
						<Icon icon={MessageSquare} />
						{comments}
						<WideText>{comments === 1 ? "comment" : "comments"}</WideText>
					</ButtonLink>

					{aiChat ? (
						<ButtonLink
							variant="ghost"
							to="/chat/$storyId"
							params={{ storyId: story.id }}
							aria-label={`Ask AI about ${title}`}
							onClick={() => recordStoryView(story, "chat_opened")}
						>
							<Icon icon={Sparkles} accent />
							Ask AI
						</ButtonLink>
					) : null}
				</>
			}
			save={
				<ToggleButton
					aria-label={`Save ${title}`}
					pressed={isFav}
					onPressedChange={() => toggleFavorite(story)}
				>
					<Icon icon={Bookmark} filled={isFav} />
					<ToggleLabel
						on={isFav}
						offLabel="Save"
						onLabel="Saved"
						iconOnlyOnPhones
					/>
				</ToggleButton>
			}
		/>
	);
}
