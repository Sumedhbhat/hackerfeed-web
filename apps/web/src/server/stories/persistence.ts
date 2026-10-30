import "@tanstack/react-start/server-only";

import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";

export function mapHackerNewsStory(story: HackerNewsStoryRecord) {
	return {
		hnStoryId: story.id,
		title: story.title,
		url: story.url,
		text: story.text,
		score: story.score,
		hnPostedAt: story.time ? new Date(story.time * 1000).toISOString() : null,
		authorUsername: story.by,
		commentCount: story.descendants,
		commentIds: JSON.stringify(story.kids ?? []),
	};
}
