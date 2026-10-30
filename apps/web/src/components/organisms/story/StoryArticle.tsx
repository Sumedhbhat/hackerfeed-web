import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
} from "@hackerfeed/hacker-news/utils";
import { Card } from "@hackerfeed/ui/atoms/Card";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { ExternalLink, TextLink } from "@hackerfeed/ui/atoms/Link";
import { Prose } from "@hackerfeed/ui/atoms/Prose";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { MetaLine } from "@hackerfeed/ui/molecules/MetaLine";
import { StoryStats } from "@hackerfeed/ui/molecules/StoryStats";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useFeatureFlag } from "#/hooks/useFeatureFlags";
import { useViewActivity } from "#/hooks/useViewActivity";

/** Header card at the top of the story page: title, body text, stats and links. */
export function StoryArticle({ story }: { story: HackerNewsStoryRecord }) {
	const age = formatStoryAge(story.time);
	const domain = getStoryDomain(story.url);
	const title = getStoryTitle(story);
	const aiChat = useFeatureFlag("aiChat");
	const { recordStoryView } = useViewActivity();

	return (
		<Card padding="md" animated>
			<MetaLine items={[domain, age]} />
			<Stack gap="lg">
				<Heading level={1} size="title">
					{title}
				</Heading>

				{/* Story body text (Ask HN / Show HN posts) */}
				{story.text && <Prose html={story.text} />}

				<StoryStats
					score={story.score}
					by={story.by}
					commentCount={story.descendants}
				/>

				<Row gap="lg" wrap>
					{story.url && (
						<ExternalLink
							href={story.url}
							variant="accent"
							onClick={() => recordStoryView(story, "read")}
						>
							Read article <Icon icon={ArrowRight} muted />
						</ExternalLink>
					)}
					<ExternalLink href={getDiscussionUrl(story.id)}>
						View on HN
					</ExternalLink>
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
				</Row>
			</Stack>
		</Card>
	);
}
