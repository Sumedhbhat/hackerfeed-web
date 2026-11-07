import type { stories } from "@hackerfeed/backend/database/schema";
import * as hackerNews from "../hacker-news";

type Story = typeof stories.$inferSelect;

/** The stored copy of a Hacker News story, as the app saves it on favorite. */
export const storedStory = (
	{ story }: hackerNews.Thread,
	fields: Partial<Story> = {},
): Story => ({
	id: `demo-story-${story.id}`,
	hnStoryId: story.id,
	title: story.title,
	url: story.url ?? null,
	text: story.text ?? null,
	score: story.score,
	hnPostedAt: new Date(story.time * 1000).toISOString(),
	authorUsername: story.by,
	commentCount: story.descendants,
	commentIds: JSON.stringify(story.kids ?? []),
	...fields,
});

/** The first top stories, stored as if the demo reader had saved them. */
export const storyRows: Story[] = hackerNews.threads
	.slice(0, 6)
	.map((thread) => storedStory(thread));
