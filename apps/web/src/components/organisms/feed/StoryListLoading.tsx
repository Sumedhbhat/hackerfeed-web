import { fake, Skeleton } from "@autoskeleton/react";
import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import { ReadingList } from "@hackerfeed/ui/atoms/ReadingList";
import { StoryCard } from "#/components/organisms/story/StoryCard";
import { PAGE_SIZE } from "#/lib/hacker-news/queries";

const STORIES_PLACEHOLDER: HackerNewsStoryRecord[] = fake.list(
	PAGE_SIZE,
	(i) => ({
		id: fake.id(i, "number"),
		by: fake.text(8, i),
		descendants: 88,
		kids: [],
		score: 888,
		text: null,
		time: null,
		title: fake.sentence(7 + (i % 5), i),
		type: "story",
		url: "https://example.com/",
	}),
);

export function StoryListLoading() {
	return (
		<Skeleton loading label="Loading stories">
			<ReadingList ordered>
				{STORIES_PLACEHOLDER.map((story) => (
					<StoryCard key={story.id} story={story} />
				))}
			</ReadingList>
		</Skeleton>
	);
}
