import { describe, expect, it } from "vitest";
import type {
	HackerNewsCommentRecord,
	HackerNewsStoryRecord,
} from "#/lib/hacker-news/queries";
import {
	buildStoryChatInstructions,
	MAX_CONTEXT_COMMENTS,
} from "./story-context";

function story(
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "pg",
		descendants: 12,
		id: 42,
		kids: [],
		score: 300,
		text: null,
		time: 1_700_000_000,
		title: "Show HN: A thing",
		type: "story",
		url: "https://example.com/thing",
		...overrides,
	};
}

function comment(
	id: number,
	overrides: Partial<HackerNewsCommentRecord> = {},
): HackerNewsCommentRecord {
	return {
		id,
		by: `user${id}`,
		text: `<p>Comment ${id}</p>`,
		time: 1_700_000_000,
		kids: [],
		parent: 42,
		type: "comment",
		deleted: false,
		dead: false,
		...overrides,
	};
}

describe("buildStoryChatInstructions", () => {
	it("includes the story metadata and links", () => {
		const instructions = buildStoryChatInstructions(story());

		expect(instructions).toContain("Title: Show HN: A thing");
		expect(instructions).toContain("Article URL: https://example.com/thing");
		expect(instructions).toContain(
			"Hacker News discussion: https://news.ycombinator.com/item?id=42",
		);
		expect(instructions).toContain("Posted by pg · 300 points · 12 comments");
		expect(instructions).not.toContain("Top Hacker News comments");
	});

	it("omits the article URL for text posts and strips HTML from the body", () => {
		const instructions = buildStoryChatInstructions(
			story({ url: null, text: "<p>Ask HN: <i>why</i>?</p>" }),
		);

		expect(instructions).not.toContain("Article URL");
		expect(instructions).toContain("Post text:\nAsk HN: why ?");
	});

	it("includes live top-level comments, stripped and attributed", () => {
		const instructions = buildStoryChatInstructions(story(), [
			comment(1),
			comment(2, { deleted: true }),
			comment(3, { dead: true }),
			comment(4, { text: null }),
			comment(5, { by: null }),
		]);

		expect(instructions).toContain("- user1: Comment 1");
		expect(instructions).toContain("- anonymous: Comment 5");
		expect(instructions).not.toContain("Comment 2");
		expect(instructions).not.toContain("Comment 3");
	});

	it("caps the number and length of comments and the post text", () => {
		const comments = Array.from({ length: MAX_CONTEXT_COMMENTS + 5 }, (_, i) =>
			comment(i + 1, { text: "y".repeat(2_000) }),
		);
		const instructions = buildStoryChatInstructions(
			story({ text: "x".repeat(10_000) }),
			comments,
		);

		expect(instructions.match(/^- user/gm)).toHaveLength(MAX_CONTEXT_COMMENTS);
		expect(instructions).not.toContain("x".repeat(4_001));
		expect(instructions).not.toContain("y".repeat(1_001));
		expect(instructions).toContain("…");
	});
});
