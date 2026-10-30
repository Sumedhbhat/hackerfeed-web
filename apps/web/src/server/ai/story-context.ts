import "@tanstack/react-start/server-only";

import type {
	HackerNewsCommentRecord,
	HackerNewsStoryRecord,
} from "#/lib/hacker-news/queries";
import {
	getDiscussionUrl,
	getStoryTitle,
	stripHtml,
} from "#/lib/hacker-news/utils";

export const MAX_CONTEXT_COMMENTS = 8;
const MAX_STORY_TEXT_LENGTH = 4_000;
const MAX_COMMENT_LENGTH = 1_000;

function truncate(value: string, maxLength: number): string {
	return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

/** Builds the system-level guidance for a chat about one Hacker News story. */
export function buildStoryChatInstructions(
	story: HackerNewsStoryRecord,
	comments: HackerNewsCommentRecord[] = [],
): string {
	const storyText = truncate(stripHtml(story.text), MAX_STORY_TEXT_LENGTH);
	const commentLines = comments
		.filter((comment) => !comment.deleted && !comment.dead && comment.text)
		.slice(0, MAX_CONTEXT_COMMENTS)
		.map(
			(comment) =>
				`- ${comment.by ?? "anonymous"}: ${truncate(stripHtml(comment.text), MAX_COMMENT_LENGTH)}`,
		);

	return [
		"You are HackerFeed's reading companion. The user wants to discuss and fully understand the Hacker News story below.",
		"Explain the core ideas, why they matter, and where they're useful. Answer follow-up questions directly and concisely, and say when you're unsure instead of guessing.",
		"If you can't open the article, rely on the details below and say so when it matters.",
		"",
		`Title: ${getStoryTitle(story)}`,
		story.url ? `Article URL: ${story.url}` : null,
		`Hacker News discussion: ${getDiscussionUrl(story.id)}`,
		`Posted by ${story.by ?? "unknown"} · ${story.score} points · ${story.descendants} comments`,
		storyText ? `\nPost text:\n${storyText}` : null,
		commentLines.length > 0
			? `\nTop Hacker News comments:\n${commentLines.join("\n")}`
			: null,
	]
		.filter((line) => line !== null)
		.join("\n");
}
