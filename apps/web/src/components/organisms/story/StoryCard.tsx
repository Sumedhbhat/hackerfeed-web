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
import { FeedRow } from "@hackerfeed/ui/molecules/FeedRow";
import { StoryMeta } from "@hackerfeed/ui/molecules/StoryMeta";
import { Bookmark, MessageSquare, Sparkles } from "lucide-react";
import { useFavorites } from "#/hooks/useFavorites";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";

type StoryCardProps = {
	story: HackerNewsStoryRecord;
	/** Position in a ranked feed; omit for unranked lists such as favorites. */
	rank?: number;
};

export function StoryCard({ story, rank }: StoryCardProps) {
	const { isFavorited, toggleFavorite } = useFavorites();
	const { recordStoryView } = useViewActivity();
	const aiChat = useFeatureFlag("aiChat");
	const isFav = isFavorited(story.id);

	const title = getStoryTitle(story);
	const storyUrl = story.url ?? getDiscussionUrl(story.id);
	const comments = story.descendants ?? 0;

	function recordRead() {
		recordStoryView(story, "read");
	}

	function recordMiddleClickRead(event: React.MouseEvent) {
		if (event.button === 1) recordRead();
	}

	return (
		<FeedRow
			rank={rank}
			saved={isFav}
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
					domain={getStoryDomain(story.url)}
					score={story.score}
					by={story.by}
					age={formatStoryAge(story.time)}
				/>
			}
			actions={
				<>
					<ExternalButtonLink
						href={storyUrl}
						variant="soft"
						onClick={recordRead}
						onAuxClick={recordMiddleClickRead}
					>
						{story.url ? "Read article" : "Open post"}
					</ExternalButtonLink>

					<ButtonLink
						variant="ghost"
						to="/story/$storyId"
						params={{ storyId: story.id }}
						onClick={() => recordStoryView(story, "discussion_opened")}
					>
						<Icon icon={MessageSquare} />
						{comments} {comments === 1 ? "comment" : "comments"}
					</ButtonLink>

					{aiChat ? (
						<ButtonLink
							variant="ghost"
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
						aria-label="Save to favorites"
						pressed={isFav}
						onPressedChange={() => toggleFavorite(story)}
					>
						<Icon icon={Bookmark} filled={isFav} />
						{isFav ? "Saved" : "Save"}
					</ToggleButton>
				</>
			}
		/>
	);
}
