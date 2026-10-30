import type { stories } from "#/server/database/schema";
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

export const tinySpreadsheet = storedStory(hackerNews.tinySpreadsheet);
export const buildCache = storedStory(hackerNews.buildCache);
export const sideProjects = storedStory(hackerNews.sideProjects);
export const queryPlans = storedStory(hackerNews.queryPlans);
export const serverHtml = storedStory(hackerNews.serverHtml);
export const placeholderLabs = storedStory(hackerNews.placeholderLabs);

export const storyRows: Story[] = [
	tinySpreadsheet,
	buildCache,
	sideProjects,
	queryPlans,
	serverHtml,
	placeholderLabs,
];
